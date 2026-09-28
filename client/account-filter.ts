import type { Account } from '../server/domain.js';
export type AccountSort = 'name-asc' | 'name-desc' | 'balance-asc' | 'balance-desc';

export function filterAccounts(accounts: Account[], search: string, type: string, sort: AccountSort): Account[] {
  const query = search.trim().toLocaleLowerCase('en-US');
  // O(n log n) sorting on a copied filtered array; source records stay unchanged.
  return accounts.filter(account => (type === 'All' || account.type === type) && account.name.toLocaleLowerCase('en-US').includes(query))
    .sort((a, b) => {
      const difference = sort.startsWith('name') ? a.name.localeCompare(b.name, 'en-US') : a.balanceCents - b.balanceCents;
      return (sort.endsWith('desc') ? -difference : difference) || a.id.localeCompare(b.id, 'en-US');
    });
}
