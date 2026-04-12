import fs from 'fs';
import path from 'path';
import { pool, query } from './db';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running migration: ${file}`);
    await query(sql);
    console.log(`Done: ${file}`);
  }

  await pool.end();
  console.log('All migrations completed.');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
