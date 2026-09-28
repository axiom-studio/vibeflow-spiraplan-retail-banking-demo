export const schema = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Checking','Savings','Investment')),
  number TEXT NOT NULL, currency TEXT NOT NULL CHECK(currency = 'USD'),
  openingBalanceCents INTEGER NOT NULL CHECK(openingBalanceCents BETWEEN 0 AND 9007199254740991),
  balanceCents INTEGER NOT NULL CHECK(balanceCents BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX IF NOT EXISTS accounts_user ON accounts(userId);
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id),
  sourceAccountId TEXT NOT NULL REFERENCES accounts(id),
  destinationAccountId TEXT NOT NULL REFERENCES accounts(id),
  amountCents INTEGER NOT NULL CHECK(amountCents BETWEEN 1 AND 9007199254740991),
  idempotencyKey TEXT NOT NULL, date TEXT NOT NULL,
  CHECK(sourceAccountId != destinationAccountId), UNIQUE(userId, idempotencyKey)
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL, description TEXT NOT NULL,
  amountCents INTEGER NOT NULL CHECK(amountCents BETWEEN -9007199254740991 AND 9007199254740991),
  type TEXT NOT NULL CHECK(type IN ('Debit','Credit','Transfer')),
  category TEXT NOT NULL CHECK(category IN ('Income','Shopping','Bills','Transfer','Other')),
  notes TEXT NOT NULL DEFAULT '', transferId TEXT REFERENCES transfers(id)
);
CREATE INDEX IF NOT EXISTS transactions_account_date ON transactions(accountId, date DESC, id);
PRAGMA user_version = 1;
`;
