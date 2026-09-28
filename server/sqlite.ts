import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Account, Transaction, User } from './domain.js';
import type { BankingRepository } from './repository.js';
import { schema } from './schema.js';
import { parseFixture } from './fixtures.js';
import { importSqliteFixture } from './sqlite-import.js';

export class SqliteRepository implements BankingRepository {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    const version = this.db.prepare('PRAGMA user_version').get()?.user_version;
    if (version === 0) this.db.exec(`BEGIN; ${schema} COMMIT;`);
    else if (version !== 1) { this.db.close(); throw new Error('Unsupported database schema version'); }
  }

  async isEmpty() { return !this.db.prepare('SELECT 1 FROM users LIMIT 1').get(); }

  async importFixture(input: unknown, dryRun = false) {
    return importSqliteFixture(this.db, parseFixture(input), dryRun);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as User | undefined;
  }

  async listAccounts(userId: string): Promise<Account[]> {
    // Indexed owner lookup, O(log n + k); ordering costs O(k log k).
    return this.db.prepare('SELECT * FROM accounts WHERE userId = ? ORDER BY name, id').all(userId) as unknown as Account[];
  }

  async getAccount(userId: string, id: string): Promise<Account | undefined> {
    return this.db.prepare('SELECT * FROM accounts WHERE userId = ? AND id = ?').get(userId, id) as unknown as Account | undefined;
  }

  async listTransactions(userId: string, accountId: string): Promise<Transaction[]> {
    // Indexed account/date lookup returns O(k) records, with an owner guard.
    return this.db.prepare(`SELECT t.* FROM transactions t JOIN accounts a ON a.id = t.accountId
      WHERE a.userId = ? AND a.id = ? ORDER BY t.date DESC, t.id`).all(userId, accountId) as unknown as Transaction[];
  }

  async getTransaction(userId: string, accountId: string, id: string): Promise<Transaction | undefined> {
    return this.db.prepare(`SELECT t.* FROM transactions t JOIN accounts a ON a.id = t.accountId
      WHERE a.userId = ? AND a.id = ? AND t.id = ?`).get(userId, accountId, id) as unknown as Transaction | undefined;
  }

  close() { this.db.close(); }
}
