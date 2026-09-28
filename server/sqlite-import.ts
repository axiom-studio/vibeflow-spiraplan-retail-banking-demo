import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { DomainError } from './domain.js';
import type { Fixture, ImportResult } from './fixtures.js';

/** Called only by the SQLite adapter; all dynamic SQL identifiers come from fixed internal objects. */
function insertOnce(db: DatabaseSync, table: 'users' | 'accounts' | 'transactions', row: Record<string, SQLInputValue>, compare = row) {
  const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(row.id);
  if (existing) {
    if (Object.entries(compare).some(([key, value]) => existing[key] !== value)) {
      throw new DomainError('fixture_conflict', `Conflicting ${table} ID: ${row.id}`, 409);
    }
    return false;
  }
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
  return true;
}

function insertTransaction(db: DatabaseSync, entry: Fixture['transactions'][number]) {
  const { userId, ...transaction } = entry;
  const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND userId = ?').get(entry.accountId, userId);
  if (!account) throw new DomainError('invalid_reference', `Account ${entry.accountId} does not belong to user ${userId}`);
  if (!insertOnce(db, 'transactions', { ...transaction, transferId: null })) return false;
  const balance = Number(account.balanceCents) + entry.amountCents;
  if (!Number.isSafeInteger(balance) || balance < 0) throw new DomainError('invalid_balance', `Transaction ${entry.id} would create an invalid balance`);
  db.prepare('UPDATE accounts SET balanceCents = ? WHERE id = ?').run(balance, entry.accountId);
  return true;
}

export function importSqliteFixture(db: DatabaseSync, fixture: Fixture, dryRun: boolean): ImportResult {
  const result = { created: 0, skipped: 0, dryRun };
  const count = (created: boolean) => { result[created ? 'created' : 'skipped']++; };
  db.exec('BEGIN IMMEDIATE');
  try {
    // O(n log m) indexed inserts/lookups; all rows commit or roll back together.
    for (const user of fixture.users) count(insertOnce(db, 'users', user));
    for (const account of fixture.accounts) {
      if (!db.prepare('SELECT id FROM users WHERE id = ?').get(account.userId)) {
        throw new DomainError('invalid_reference', `User ${account.userId} for account ${account.id} does not exist`);
      }
      count(insertOnce(db, 'accounts', { ...account, balanceCents: account.openingBalanceCents }, account));
    }
    for (const transaction of fixture.transactions) count(insertTransaction(db, transaction));
    db.exec(dryRun ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    if (error instanceof DomainError) throw error;
    throw new Error('Unable to import fixture into SQLite', { cause: error });
  }
}
