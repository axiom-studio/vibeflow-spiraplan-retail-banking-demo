import type { Account, Transaction, User } from './domain.js';
import type { ImportResult } from './fixtures.js';

/** Database-neutral boundary; a future PostgreSQL adapter supplies the same operations. */
export interface BankingRepository {
  isEmpty(): Promise<boolean>;
  importFixture(input: unknown, dryRun?: boolean): Promise<ImportResult>;
  getUser(id: string): Promise<User | undefined>;
  listAccounts(userId: string): Promise<Account[]>;
  getAccount(userId: string, id: string): Promise<Account | undefined>;
  listTransactions(userId: string, accountId: string): Promise<Transaction[]>;
  getTransaction(userId: string, accountId: string, id: string): Promise<Transaction | undefined>;
  close(): void;
}
