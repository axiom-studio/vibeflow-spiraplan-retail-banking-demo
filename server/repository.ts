import type { Account, Transaction, User } from './domain.js';

/** Database-neutral boundary; a future PostgreSQL adapter supplies the same operations. */
export interface BankingRepository {
  getUser(id: string): Promise<User | undefined>;
  listAccounts(userId: string): Promise<Account[]>;
  getAccount(userId: string, id: string): Promise<Account | undefined>;
  listTransactions(userId: string, accountId: string): Promise<Transaction[]>;
  getTransaction(userId: string, accountId: string, id: string): Promise<Transaction | undefined>;
  close(): void;
}
