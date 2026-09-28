import { parseArgs } from 'node:util';
import { readFileSync, existsSync } from 'node:fs';
import { SqliteRepository } from '../server/sqlite.js';
import { parseFixture } from '../server/fixtures.js';

try {
  const { values } = parseArgs({ options: { file: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
  if (!values.file) throw new Error('Usage: npm run data:publish -- --file fixtures/example.json [--dry-run]');
  const fixture = parseFixture(JSON.parse(readFileSync(values.file, 'utf8')));
  const path = process.env.DATABASE_PATH ?? 'data/banking.sqlite';
  const repository = new SqliteRepository(values['dry-run'] && !existsSync(path) ? ':memory:' : path);
  try { console.log(JSON.stringify(await repository.importFixture(fixture, values['dry-run']))); }
  finally { repository.close(); }
} catch (error) {
  console.error(`Data publishing failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
