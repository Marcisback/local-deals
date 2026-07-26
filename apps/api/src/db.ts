import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

export async function checkDatabaseConnection() {
  const client = await getDatabasePool().connect();

  try {
    await client.query('select 1');
  } finally {
    client.release();
  }
}

export async function queryDatabase<T extends QueryResultRow>(text: string): Promise<QueryResult<T>>;
export async function queryDatabase<T extends QueryResultRow>(text: string, values: unknown[]): Promise<QueryResult<T>>;
export async function queryDatabase<T extends QueryResultRow>(text: string, values?: unknown[]) {
  return values === undefined ? getDatabasePool().query<T>(text) : getDatabasePool().query<T>(text, values);
}

export async function withDatabaseTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getDatabasePool().connect();

  try {
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Prefer surfacing the original failure; rollback errors are secondary.
    }

    throw error;
  } finally {
    client.release();
  }
}

export function hasDatabasePool() {
  return pool !== null;
}

export async function closeDatabasePool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}

function getDatabasePool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for database operations.');
  }

  pool = new Pool({
    connectionString
  });

  return pool;
}
