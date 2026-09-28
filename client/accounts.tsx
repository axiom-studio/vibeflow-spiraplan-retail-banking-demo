import { useState } from 'react';
import type { Account } from '../server/domain.js';
import { useResource } from './api.js';
import { PageHeader, MoneyText, EmptyState, InlineAlert, LoadingState } from './components.js';
import { filterAccounts } from './account-filter.js';
import type { AccountSort } from './account-filter.js';

export function Accounts() {
  const { data, error, loading, retry } = useResource<Account[]>('/api/accounts');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [sort, setSort] = useState<AccountSort>('name-asc');
  const filtered = filterAccounts(data ?? [], search, type, sort);
  return <>
    <PageHeader title="Accounts" subtitle="Your balances, together in one place." />
    {error ? <InlineAlert message={error} retry={retry} /> : loading ? <LoadingState /> : <>
      <div className="toolbar">
        <label className="search-field">Search accounts<input type="search" placeholder="Search by account name" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label>Account type<select value={type} onChange={e => setType(e.target.value)}>{['All', 'Checking', 'Savings', 'Investment'].map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Sort by<select value={sort} onChange={e => setSort(e.target.value as AccountSort)}><option value="name-asc">Name: A–Z</option><option value="name-desc">Name: Z–A</option><option value="balance-desc">Balance: high to low</option><option value="balance-asc">Balance: low to high</option></select></label>
      </div>
      <div className="list-caption"><span aria-live="polite">{filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}</span><span>Current balance · USD</span></div>
      {!data?.length ? <EmptyState title="No accounts available"><p>Your accounts will appear here when they are added.</p></EmptyState> : !filtered.length ? <EmptyState title="No accounts match"><p>Try another name or account type.</p><button onClick={() => { setSearch(''); setType('All'); }}>Clear filters</button></EmptyState> : <div className="account-list">
        {filtered.map(account => <article className="account-row" key={account.id}>
          <div className={`account-symbol ${account.type.toLowerCase()}`} aria-hidden="true">{account.type === 'Checking' ? '↗' : account.type === 'Savings' ? '◇' : '▥'}</div>
          <div className="account-name"><a href={`#/accounts/${encodeURIComponent(account.id)}`}>{account.name}<span className="row-arrow" aria-hidden="true">↗</span></a><p>{account.type} <span aria-hidden="true">·</span> Account ending {account.number.slice(-4)}</p></div>
          <div className="account-balance"><MoneyText cents={account.balanceCents} /><span>Available to transfer</span></div>
        </article>)}
      </div>}
      <p className="balance-note">Balances reflect completed transactions. This demo uses simulated funds.</p>
    </>}
  </>;
}
