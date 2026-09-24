import oracledb from 'oracledb';

export type DatabaseHealth = { database: 'Oracle'; connected: boolean; mode: 'oracle' | 'demo'; message: string };

const tableMap = {
  vehicles: 'vehicles', drivers: 'drivers', routes: 'routes', passengers: 'passengers',
  trips: 'trips', bookings: 'bookings', payments: 'payments', maintenance: 'maintenance_records', feedback: 'feedback',
} as const;

type Resource = keyof typeof tableMap;
let pool: oracledb.Pool | undefined;

const configured = () => Boolean(process.env.ORACLE_USER && process.env.ORACLE_PASSWORD && process.env.ORACLE_CONNECT_STRING);

async function getPool(): Promise<oracledb.Pool> {
  if (!configured()) throw new Error('Oracle credentials are not configured');
  pool ??= await oracledb.createPool({ user: process.env.ORACLE_USER, password: process.env.ORACLE_PASSWORD, connectString: process.env.ORACLE_CONNECT_STRING, poolMin: 0, poolMax: 4, poolIncrement: 1 });
  return pool;
}

const camelCase = (key: string) => key.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const mapRow = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [camelCase(key), value]));

export async function oracleHealth(): Promise<DatabaseHealth> {
  if (!configured()) return { database: 'Oracle', connected: false, mode: 'demo', message: 'Oracle credentials are not configured; using demo data' };
  try {
    const connection = await (await getPool()).getConnection();
    await connection.execute('SELECT 1 AS HEALTH_CHECK FROM dual');
    await connection.close();
    return { database: 'Oracle', connected: true, mode: 'oracle', message: 'Oracle connection is healthy' };
  } catch (error) {
    return { database: 'Oracle', connected: false, mode: 'demo', message: `Oracle unavailable; using demo data (${error instanceof Error ? error.message : 'connection error'})` };
  }
}

export async function oracleList(resource: Resource): Promise<Record<string, unknown>[]> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(`SELECT * FROM ${tableMap[resource]}`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return (result.rows ?? []).map(mapRow);
  } finally {
    await connection.close();
  }
}

export async function closeOracle(): Promise<void> {
  if (pool) await pool.close(0);
  pool = undefined;
}
