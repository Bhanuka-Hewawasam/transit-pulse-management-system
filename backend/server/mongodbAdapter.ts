import { MongoClient, type Db } from 'mongodb';

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
let client: MongoClient | undefined;
let db: Db | undefined;

const configured = () => Boolean(process.env.MONGODB_URI && process.env.MONGODB_DATABASE);

async function getDb(): Promise<Db> {
  if (!configured()) throw new Error('MongoDB credentials are not configured');
  if (!db) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    db = client.db(process.env.MONGODB_DATABASE);
  }
  return db;
}

export async function mongodbHealth(): Promise<MongoHealth> {
  const demoMode = process.env.DATABASE_MODE === 'demo';
  if (!configured()) return { database: 'MongoDB', connected: false, mode: demoMode ? 'demo' : 'mongodb', message: demoMode ? 'MongoDB is not configured; demo content is available' : 'MongoDB is not configured' };
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
    database.collection('trip_media').find({}).toArray(),
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

export async function mongodbPassengerReviews(): Promise<Record<string, unknown>[]> {
  const database = await getDb();
  return readWithLegacy(database, 'passenger_feedback', 'passenger_reviews');
}

export async function closeMongo(): Promise<void> {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}
