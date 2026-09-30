import { MongoClient, ObjectId, type Db } from 'mongodb';

export type MongoHealth = { database: 'MongoDB'; connected: boolean; mode: 'mongodb' | 'demo'; message: string };
export type AnnouncementAudience = 'all' | 'passengers' | 'drivers';
export type TravelAnnouncementInput = {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  startDate: string;
  endDate?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'scheduled' | 'expired';
  routeId?: string;
  tripId?: string;
};
export type PassengerReviewInput = {
  type: 'review' | 'complaint';
  passengerId: number;
  passengerName: string;
  tripId?: number;
  rating?: number;
  title?: string;
  comment: string;
  category?: string;
  routeId?: number;
  driverId?: number;
  vehicleId?: number;
};
export type TripMediaInput = {
  tripId: number;
  driverId: number;
  routeId?: number;
  caption: string;
  contentType: string;
  image: Buffer;
};
export type TripMediaStatus = 'approved' | 'rejected';
export type VehicleDocumentInput = {
  vehicleId: number;
  registration: string;
  documentType: string;
  fileUrl: string;
  expiresOn?: string;
};
let client: MongoClient | undefined;
let db: Db | undefined;
let connecting: Promise<Db> | undefined;

const configurationError = () => !process.env.MONGODB_URI
  ? 'MONGODB_URI is not configured'
  : !process.env.MONGODB_DATABASE ? 'MONGODB_DATABASE is not configured' : null;

async function getDb(): Promise<Db> {
  const issue = configurationError();
  if (issue) throw new Error(issue);
  if (db) return db;
  if (!connecting) {
    const newClient = new MongoClient(process.env.MONGODB_URI!);
    client = newClient;
    connecting = newClient.connect().then(() => {
      db = newClient.db(process.env.MONGODB_DATABASE);
      return db;
    }).catch(async (error: unknown) => {
      if (client === newClient) client = undefined;
      db = undefined;
      await newClient.close().catch(() => undefined);
      throw error;
    }).finally(() => {
      connecting = undefined;
    });
  }
  return connecting;
}

export async function mongodbHealth(): Promise<MongoHealth> {
  const demoMode = process.env.DATABASE_MODE === 'demo';
  const issue = configurationError();
  if (issue) return { database: 'MongoDB', connected: false, mode: demoMode ? 'demo' : 'mongodb', message: demoMode ? `${issue}; demo content is available` : issue };
  try {
    await (await getDb()).command({ ping: 1 });
    return { database: 'MongoDB', connected: true, mode: 'mongodb', message: 'MongoDB connection is healthy' };
  } catch {
    return { database: 'MongoDB', connected: false, mode: demoMode ? 'demo' : 'mongodb', message: demoMode ? 'MongoDB is unavailable; demo content is available' : 'MongoDB connection failed' };
  }
}

export async function mongodbContent(includeInactiveAnnouncements = false): Promise<{ reviews: unknown[]; announcements: unknown[]; documents: unknown[]; media: unknown[] }> {
  const database = await getDb();
  const [reviews, announcements, documents, media] = await Promise.all([
    readWithLegacy(database, 'passenger_feedback', 'passenger_reviews'),
    readWithLegacy(database, 'announcements', 'travel_announcements', includeInactiveAnnouncements ? {} : { active: true }),
    database.collection('vehicle_documents').find({}).toArray(),
    database.collection('trip_media').find({}, { projection: { imageData: 0, contentType: 0 } }).toArray(),
  ]);
  return { reviews, announcements, documents, media };
}

async function readWithLegacy(database: Db, collectionName: string, legacyName: string, filter: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
  const [current, legacy] = await Promise.all([
    database.collection(collectionName).find(filter).toArray(),
    database.collection(legacyName).find(filter).toArray(),
  ]);
  const records = new Map<string, Record<string, unknown>>();
  for (const record of [...legacy, ...current]) {
    const id = record._id?.toString();
    records.set(id ?? `${legacyName}-${records.size}`, record as Record<string, unknown>);
  }
  return [...records.values()];
}

export async function mongodbCreateAnnouncement(input: TravelAnnouncementInput): Promise<Record<string, unknown>> {
  const database = await getDb();
  const timestamp = new Date().toISOString();
  const announcement = {
    type: 'announcement',
    ...input,
    active: input.status === 'published',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const result = await database.collection('announcements').insertOne(announcement);
  return { ...announcement, id: result.insertedId.toString() };
}

export async function mongodbCreatePassengerReview(input: PassengerReviewInput): Promise<Record<string, unknown>> {
  const database = await getDb();
  const timestamp = new Date().toISOString();
  const review = { ...input, status: 'new', createdAt: timestamp, updatedAt: timestamp };
  const result = await database.collection('passenger_feedback').insertOne(review);
  if (!result.acknowledged || !result.insertedId) throw new Error('MongoDB did not acknowledge the feedback insert.');
  return { ...review, _id: result.insertedId.toString() };
}

export async function mongodbCreateTripMedia(input: TripMediaInput): Promise<Record<string, unknown>> {
  const database = await getDb();
  const { image, contentType, ...metadata } = input;
  const id = new ObjectId();
  const url = `/api/mongodb/media/${id.toString()}/image`;
  const media = {
    _id: id,
    ...metadata,
    mediaType: 'photo',
    contentType,
    imageData: image.toString('base64'),
    status: 'pending',
    visibility: 'hidden',
    uploadedBy: `driver:${input.driverId}`,
    createdAt: new Date().toISOString(),
    url,
  };
  await database.collection('trip_media').insertOne(media);
  return { ...metadata, mediaType: 'photo', status: media.status, visibility: media.visibility, uploadedBy: media.uploadedBy, createdAt: media.createdAt, id: id.toString(), url };
}

export async function mongodbUpdateTripMediaStatus(id: string, status: TripMediaStatus): Promise<Record<string, unknown> | null> {
  if (!ObjectId.isValid(id)) return null;
  const database = await getDb();
  const collection = database.collection('trip_media');
  const result = await collection.updateOne({ _id: new ObjectId(id) }, {
    $set: { status, visibility: status === 'approved' ? 'public' : 'hidden', reviewedAt: new Date().toISOString() },
  });
  if (!result.matchedCount) return null;
  return collection.findOne({ _id: new ObjectId(id) }, { projection: { imageData: 0, contentType: 0 } });
}

export async function mongodbTripMediaImage(id: string): Promise<{ contentType: string; image: Buffer } | null> {
  if (!ObjectId.isValid(id)) return null;
  const database = await getDb();
  const record = await database.collection('trip_media').findOne({ _id: new ObjectId(id) }, { projection: { contentType: 1, imageData: 1 } });
  if (typeof record?.contentType !== 'string' || typeof record.imageData !== 'string') return null;
  return { contentType: record.contentType, image: Buffer.from(record.imageData, 'base64') };
}

export async function mongodbPassengerReviews(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  const records = await database.collection('passenger_feedback').find({}).sort({ createdAt: -1 }).toArray();
  return records.map(({ _id, ...record }) => ({ ...record, ...( _id === undefined ? {} : { _id: String(_id) }) }));
}

export async function mongodbCreateVehicleDocument(input: VehicleDocumentInput): Promise<Record<string, unknown>> {
  const database = await getDb();
  const timestamp = new Date().toISOString();
  const document = {
    ...input,
    ...(input.expiresOn ? { expiresOn: new Date(input.expiresOn) } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const result = await database.collection('vehicle_documents').insertOne(document);
  if (!result.acknowledged || !result.insertedId) throw new Error('MongoDB did not acknowledge the vehicle document insert.');
  return { ...document, _id: result.insertedId.toString() };
}

export async function mongodbUpdateVehicleDocument(id: string, input: VehicleDocumentInput): Promise<Record<string, unknown> | null> {
  if (!ObjectId.isValid(id)) return null;
  const database = await getDb();
  const collection = database.collection('vehicle_documents');
  const update = {
    ...input,
    ...(input.expiresOn ? { expiresOn: new Date(input.expiresOn) } : { expiresOn: null }),
    updatedAt: new Date().toISOString(),
  };
  const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
  if (!result.matchedCount) return null;
  const record = await collection.findOne({ _id: new ObjectId(id) });
  if (!record) return null;
  const { _id, ...document } = record;
  return { ...document, _id: String(_id) };
}

export async function mongodbDeleteVehicleDocument(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const database = await getDb();
  const result = await database.collection('vehicle_documents').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function closeMongo(): Promise<void> {
  if (connecting) await connecting.catch(() => undefined);
  if (client) await client.close();
  client = undefined;
  db = undefined;
  connecting = undefined;
}
