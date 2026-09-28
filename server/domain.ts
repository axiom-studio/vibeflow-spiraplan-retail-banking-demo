export interface User { id: string; name: string }
export interface Account {
  id: string; userId: string; name: string;
  type: 'Checking' | 'Savings' | 'Investment';
  number: string; currency: 'USD'; openingBalanceCents: number; balanceCents: number;
}
export interface Transaction {
  id: string; accountId: string; date: string; description: string;
  amountCents: number; type: 'Debit' | 'Credit' | 'Transfer';
  category: 'Income' | 'Shopping' | 'Bills' | 'Transfer' | 'Other';
  notes: string; transferId: string | null;
}
export class DomainError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}
