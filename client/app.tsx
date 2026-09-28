import { Accounts } from './accounts.js';
import { AppShell, EmptyState } from './components.js';
import { useRoute } from './navigation.js';
import { AccountTransactions } from './transactions.js';
import { TransactionDetail } from './transaction-detail.js';
import { TransferPage } from './transfer.js';

export function App() {
  const route = useRoute();
  return <AppShell transfer={route[0] === 'transfer'}>{route[0] === 'accounts' && route.length === 1 ? <Accounts />
    : route[0] === 'transfer' && route.length <= 2 ? <TransferPage key={route.join('/')} sourceId={route[1]} />
    : route[0] === 'accounts' && route.length === 2 ? <AccountTransactions key={route[1]} accountId={route[1]} />
    : route[0] === 'accounts' && route[2] === 'transactions' && route.length === 4 ? <TransactionDetail key={route.join('/')} accountId={route[1]} transactionId={route[3]} />
      : <EmptyState title="Page not found"><a href="#/accounts">Back to accounts</a></EmptyState>}</AppShell>;
}
