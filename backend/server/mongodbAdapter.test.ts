import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoMocks = vi.hoisted(() => ({
  construct: vi.fn(),
  connect: vi.fn(),
  db: vi.fn(),
  command: vi.fn(),
  collection: vi.fn(),
  insertOne: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  close: vi.fn(),
}));

vi.mock('mongodb', () => ({
  MongoClient: class {
    constructor() { mongoMocks.construct(); }
    connect() { return mongoMocks.connect(); }
    db(name: string) { return mongoMocks.db(name); }
    close() { return mongoMocks.close(); }
  },
  ObjectId: class {
    static isValid(id: string) { return /^[a-f\d]{24}$/i.test(id); }
  },
}));

import { closeMongo, mongodbCreatePassengerReview, mongodbPassengerReviews } from './mongodbAdapter.js';

describe('MongoDB persistence adapter', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await closeMongo();
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DATABASE = 'smartmove';
    mongoMocks.connect.mockResolvedValue(undefined);
    mongoMocks.close.mockResolvedValue(undefined);
    mongoMocks.command.mockResolvedValue({ ok: 1 });
    mongoMocks.insertOne.mockResolvedValue({ acknowledged: true, insertedId: { toString: () => '507f1f77bcf86cd799439011' } });
    mongoMocks.sort.mockReturnValue({ toArray: mongoMocks.toArray });
    mongoMocks.find.mockReturnValue({ sort: mongoMocks.sort });
    mongoMocks.toArray.mockResolvedValue([]);
    mongoMocks.findOne.mockResolvedValue(null);
    mongoMocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    mongoMocks.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mongoMocks.collection.mockReturnValue({ insertOne: mongoMocks.insertOne, find: mongoMocks.find, findOne: mongoMocks.findOne, updateOne: mongoMocks.updateOne, deleteOne: mongoMocks.deleteOne });
    mongoMocks.db.mockReturnValue({ command: mongoMocks.command, collection: mongoMocks.collection });
  });

  it('inserts the normalized review into passenger_feedback and returns its generated id', async () => {
    const review = {
      type: 'review' as const,
      passengerId: 1,
      passengerName: 'Passenger One',
      routeId: 1,
      tripId: 8,
      vehicleId: 2,
      driverId: 2,
      rating: Number('5'),
      title: 'Clean bus',
      comment: 'The bus was clean and the journey was comfortable.',
    };

    const created = await mongodbCreatePassengerReview(review);

    expect(mongoMocks.collection).toHaveBeenCalledWith('passenger_feedback');
    expect(mongoMocks.insertOne).toHaveBeenCalledOnce();
    expect(mongoMocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      ...review,
      rating: 5,
      status: 'new',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }));
    expect(created).toMatchObject({ ...review, _id: '507f1f77bcf86cd799439011', rating: 5, status: 'new' });
    expect(created.createdAt).toEqual(created.updatedAt);
  });

  it('reads only passenger_feedback newest first and stringifies MongoDB ids', async () => {
    mongoMocks.toArray.mockResolvedValue([
      { _id: { toString: () => '507f1f77bcf86cd799439011' }, type: 'review', createdAt: '2026-09-30T00:00:00.000Z' },
    ]);

    const records = await mongodbPassengerReviews();

    expect(mongoMocks.collection).toHaveBeenCalledWith('passenger_feedback');
    expect(mongoMocks.find).toHaveBeenCalledWith({});
    expect(mongoMocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(records).toEqual([{ _id: '507f1f77bcf86cd799439011', type: 'review', createdAt: '2026-09-30T00:00:00.000Z' }]);
  });

  it('shares one in-flight connection across concurrent feedback writes and reads', async () => {
    let finishConnect: (() => void) | undefined;
    mongoMocks.connect.mockImplementation(() => new Promise<void>((resolve) => { finishConnect = resolve; }));

    const write = mongodbCreatePassengerReview({ type: 'review', passengerId: 1, passengerName: 'Passenger One', rating: 5, comment: 'A comment' });
    const read = mongodbPassengerReviews();
    finishConnect?.();
    await Promise.all([write, read]);

    expect(mongoMocks.construct).toHaveBeenCalledOnce();
    expect(mongoMocks.connect).toHaveBeenCalledOnce();
    expect(mongoMocks.db).toHaveBeenCalledOnce();
    expect(mongoMocks.db).toHaveBeenCalledWith('smartmove');
    expect(mongoMocks.collection).toHaveBeenCalledWith('passenger_feedback');
  });

  it('rejects an insert that MongoDB did not acknowledge', async () => {
    mongoMocks.insertOne.mockResolvedValue({ acknowledged: false });

    await expect(mongodbCreatePassengerReview({
      type: 'review', passengerId: 1, passengerName: 'Passenger One', rating: 5, comment: 'A comment',
    })).rejects.toThrow('MongoDB did not acknowledge the feedback insert.');
  });

  it('rejects an acknowledged insert that has no generated id', async () => {
    mongoMocks.insertOne.mockResolvedValue({ acknowledged: true });

    await expect(mongodbCreatePassengerReview({
      type: 'review', passengerId: 1, passengerName: 'Passenger One', rating: 5, comment: 'A comment',
    })).rejects.toThrow('MongoDB did not acknowledge the feedback insert.');
  });

  it('creates vehicle documents in the existing vehicle_documents collection', async () => {
    const { mongodbCreateVehicleDocument } = await import('./mongodbAdapter.js');
    const document = await mongodbCreateVehicleDocument({ vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'insurance', fileUrl: '/docs/insurance.pdf', expiresOn: '2027-12-31' });

    expect(mongoMocks.collection).toHaveBeenCalledWith('vehicle_documents');
    expect(mongoMocks.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      vehicleId: 1,
      registration: 'WP-CAB-1234',
      documentType: 'insurance',
      fileUrl: '/docs/insurance.pdf',
      expiresOn: new Date('2027-12-31'),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }));
    expect(document._id).toBe('507f1f77bcf86cd799439011');
  });

  it('updates and deletes vehicle documents by MongoDB ObjectId', async () => {
    const { mongodbDeleteVehicleDocument, mongodbUpdateVehicleDocument } = await import('./mongodbAdapter.js');
    const id = '507f1f77bcf86cd799439011';
    mongoMocks.findOne.mockResolvedValue({ _id: { toString: () => id }, vehicleId: 1, registration: 'WP-CAB-1234' });

    const updated = await mongodbUpdateVehicleDocument(id, { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'registration', fileUrl: '/docs/registration.pdf' });
    const deleted = await mongodbDeleteVehicleDocument(id);

    expect(mongoMocks.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: expect.anything() }), { $set: expect.objectContaining({ documentType: 'registration', expiresOn: null }) });
    expect(updated).toMatchObject({ _id: id, registration: 'WP-CAB-1234' });
    expect(mongoMocks.deleteOne).toHaveBeenCalledWith({ _id: expect.anything() });
    expect(deleted).toBe(true);
  });

  it('rejects malformed vehicle document ids without mutating MongoDB', async () => {
    const { mongodbDeleteVehicleDocument, mongodbUpdateVehicleDocument } = await import('./mongodbAdapter.js');
    const input = { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'insurance', fileUrl: '/docs/insurance.pdf' };

    await expect(mongodbUpdateVehicleDocument('not-an-object-id', input)).resolves.toBeNull();
    await expect(mongodbDeleteVehicleDocument('not-an-object-id')).resolves.toBe(false);
    expect(mongoMocks.updateOne).not.toHaveBeenCalled();
    expect(mongoMocks.deleteOne).not.toHaveBeenCalled();
  });
});