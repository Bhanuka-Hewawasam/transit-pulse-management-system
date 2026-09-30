import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  db: vi.fn(),
  command: vi.fn(),
  collection: vi.fn(),
  insertOne: vi.fn(),
  find: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
  close: vi.fn(),
}));

vi.mock('mongodb', () => ({
  MongoClient: class {
    connect() { return mongoMocks.connect(); }
    db(name: string) { return mongoMocks.db(name); }
    close() { return mongoMocks.close(); }
  },
  ObjectId: class {},
}));

import { closeMongo, mongodbCreatePassengerReview, mongodbPassengerReviews } from './mongodbAdapter.js';

describe('MongoDB passenger feedback adapter', () => {
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
    mongoMocks.collection.mockReturnValue({ insertOne: mongoMocks.insertOne, find: mongoMocks.find });
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
});