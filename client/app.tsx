import { Accounts } from './accounts.js';
import { AppShell, EmptyState } from './components.js';
import { useRoute } from './navigation.js';
import { AccountTransactions } from './transactions.js';

export function App() {
  const route = useRoute();
  return <AppShell>{route[0] === 'accounts' && route.length === 1 ? <Accounts />
    : route[0] === 'accounts' && route.length === 2 ? <AccountTransactions key={route[1]} accountId={route[1]} />
      : <EmptyState title="Page not found"><a href="#/accounts">Back to accounts</a></EmptyState>}</AppShell>;
}
