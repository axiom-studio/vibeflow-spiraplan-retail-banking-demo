import type { Account, Transaction } from '../server/domain.js';
import { useResource } from './api.js';
import { PageHeader, MoneyText, InlineAlert, LoadingState } from './components.js';
import { formatDate } from './navigation.js';

export function TransactionDetail({ accountId, transactionId }: { accountId: string; transactionId: string }) {
  const entry = useResource<Transaction>(`/api/accounts/${encodeURIComponent(accountId)}/transactions/${encodeURIComponent(transactionId)}`);
  const accounts = useResource<Account[]>('/api/accounts');
  return <><a className="back-link" href={`#/accounts/${encodeURIComponent(accountId)}`}>← Back to transactions</a>
    {entry.error ? <InlineAlert message={entry.error} retry={entry.retry} /> : accounts.error ? <InlineAlert message={accounts.error} retry={accounts.retry} /> : entry.loading || accounts.loading ? <LoadingState /> : entry.data && accounts.data ? <TransactionDetailView entry={entry.data} accounts={accounts.data} /> : null}
  </>;
}

export function TransactionDetailView({ entry, accounts }: { entry: Transaction; accounts: Account[] }) {
  const accountLabel = (id: string) => {
    const account = accounts.find(item => item.id === id);
    return account ? `${account.name} · ending ${account.number.slice(-4)}` : 'Account unavailable';
  };
  return <><PageHeader title="Transaction details" subtitle={entry.description} />
    <div className="detail-amount"><span>{entry.amountCents < 0 ? 'Money out' : 'Money in'}</span><MoneyText cents={entry.amountCents} signed /><p>{formatDate(entry.date)}</p></div>
    <dl className="details">
      <div><dt>Transaction ID</dt><dd>{entry.id}</dd></div>
      <div><dt>Date</dt><dd>{formatDate(entry.date)}</dd></div>
      <div><dt>Description</dt><dd>{entry.description}</dd></div>
      <div><dt>Type</dt><dd>{entry.type}</dd></div>
      <div><dt>Category</dt><dd>{entry.category}</dd></div>
      <div><dt>Account</dt><dd>{accountLabel(entry.accountId)}</dd></div>
      <div><dt>Notes</dt><dd>{entry.notes || 'No notes'}</dd></div>
      {entry.transfer && <>
        <div><dt>Transfer reference</dt><dd>{entry.transfer.id}</dd></div>
        <div><dt>From</dt><dd>{accountLabel(entry.transfer.sourceAccountId)}</dd></div>
        <div><dt>To</dt><dd>{accountLabel(entry.transfer.destinationAccountId)}</dd></div>
        <div><dt>Debit</dt><dd><MoneyText cents={-entry.transfer.amountCents} signed /></dd></div>
        <div><dt>Credit</dt><dd><MoneyText cents={entry.transfer.amountCents} signed /></dd></div>
      </>}
    </dl></>;
}
