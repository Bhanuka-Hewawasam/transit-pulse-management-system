import { MongoClient, type Db } from 'mongodb';

export type MongoHealth = { database: 'MongoDB'; connected: boolean; mode: 'mongodb' | 'demo'; message: string };
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
  if (!configured()) return { database: 'MongoDB', connected: false, mode: 'demo', message: 'MongoDB credentials are not configured; using demo data' };
  try {
    await (await getDb()).command({ ping: 1 });
    return { database: 'MongoDB', connected: true, mode: 'mongodb', message: 'MongoDB connection is healthy' };
  } catch (error) {
    return { database: 'MongoDB', connected: false, mode: 'demo', message: `MongoDB unavailable; using demo data (${error instanceof Error ? error.message : 'connection error'})` };
  }
}

export async function mongodbContent(): Promise<{ reviews: unknown[]; announcements: unknown[]; documents: unknown[]; media: unknown[] }> {
  const database = await getDb();
  const [reviews, announcements, documents, media] = await Promise.all([
    database.collection('passenger_reviews').find({}).toArray(),
    database.collection('travel_announcements').find({ active: true }).toArray(),
    database.collection('vehicle_documents').find({}).toArray(),
    database.collection('trip_media').find({}).toArray(),
  ]);
  return { reviews, announcements, documents, media };
}

export async function closeMongo(): Promise<void> {
  if (client) await client.close();
  client = undefined;
  db = undefined;
}
