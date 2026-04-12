import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
