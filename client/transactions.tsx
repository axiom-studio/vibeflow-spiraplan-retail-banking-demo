import type { Account, Transaction } from '../server/domain.js';
import { useEffect } from 'react';
import { useResource } from './api.js';
import { PageHeader, MoneyText, EmptyState, InlineAlert, LoadingState } from './components.js';
import { formatDate } from './navigation.js';

const selections = new Map<string, { id: string; scroll: number }>();

export function AccountTransactions({ accountId }: { accountId: string }) {
  const accounts = useResource<Account[]>('/api/accounts');
  const entries = useResource<Transaction[]>(`/api/accounts/${encodeURIComponent(accountId)}/transactions`);
  const account = accounts.data?.find(item => item.id === accountId);
  if (accounts.loading) return <LoadingState />;
  if (accounts.error) return <InlineAlert message={accounts.error} retry={accounts.retry} />;
  if (!account) return <><PageHeader title="Account not found" /><a href="#/accounts">Back to accounts</a></>;
  return <>
    <a className="back-link" href="#/accounts">← Back to accounts</a>
    <PageHeader title={account.name} subtitle={`${account.type} · Account ending ${account.number.slice(-4)}`} actions={<div className="balance-heading"><span>Current balance</span><MoneyText cents={account.balanceCents} /></div>} />
    <a className="transfer-action" href={`#/transfer/${encodeURIComponent(accountId)}`}>Transfer from this account →</a>
    <div className="section-heading"><h2>Transactions</h2><label className="inline-field">Switch account<select value={accountId} onChange={e => { location.hash = `/accounts/${encodeURIComponent(e.target.value)}`; }}>{accounts.data?.map(a => <option key={a.id} value={a.id}>{a.name} · {a.number.slice(-4)}</option>)}</select></label></div>
    {entries.error ? <InlineAlert message={entries.error} retry={entries.retry} /> : entries.loading ? <LoadingState /> : !entries.data?.length ? <EmptyState title="No transactions yet"><p>Completed activity for this account will appear here.</p></EmptyState> : <TransactionList entries={entries.data} accountId={accountId} />}
  </>;
}

export function TransactionList({ entries, accountId }: { entries: Transaction[]; accountId: string }) {
  const selected = selections.get(accountId);
  useEffect(() => {
    if (!selected) return;
    document.getElementById(`transaction-${selected.id}`)?.focus({ preventScroll: true });
    window.scrollTo(0, selected.scroll);
  }, [selected]);
  return <div className="transaction-list"><table><caption className="sr-only">Account transactions, newest first</caption><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Transaction ID</th><th className="amount-cell">Amount</th></tr></thead><tbody>
    {entries.map(entry => <tr key={entry.id} className={selected?.id === entry.id ? 'selected-row' : undefined}>
      <td data-label="Date">{formatDate(entry.date)}</td>
      <td className="description-cell" data-label="Description"><div><a id={`transaction-${entry.id}`} onClick={() => selections.set(accountId, { id: entry.id, scroll: window.scrollY })} href={`#/accounts/${encodeURIComponent(accountId)}/transactions/${encodeURIComponent(entry.id)}`}>{entry.description}</a>{selected?.id === entry.id && <span className="selection-label">Selected</span>}</div></td>
      <td data-label="Type"><span className="type-tag">{entry.type}</span></td>
      <td className="transaction-id" data-label="Transaction ID">{entry.id}</td>
      <td className="amount-cell" data-label="Amount"><MoneyText cents={entry.amountCents} signed /></td>
    </tr>)}
  </tbody></table></div>;
}
