import type { Account, Transfer } from '../server/domain.js';
import { useResource } from './api.js';
import { InlineAlert, LoadingState, PageHeader } from './components.js';
import { TransferSummary } from './transfer.js';

export function TransferReceiptPage({ transferId }: { transferId: string }) {
  const receipt = useResource<Transfer>(`/api/transfers/${encodeURIComponent(transferId)}`);
  const accounts = useResource<Account[]>('/api/accounts');
  if (receipt.loading || accounts.loading) return <LoadingState />;
  if (receipt.error || accounts.error) return <><PageHeader title="Receipt unavailable" /><InlineAlert message={receipt.error ?? accounts.error!} retry={() => { receipt.retry(); accounts.retry(); }} /><a className="back-link" href="#/accounts">Back to accounts</a></>;
  return <TransferReceipt transfer={receipt.data!} accounts={accounts.data!} />;
}

export function TransferReceipt({ transfer, accounts }: { transfer: Transfer; accounts: Account[] }) {
  return <div className="transfer-page"><PageHeader title="Transfer complete" subtitle="Your money has arrived in the destination account." />
    <p className="receipt-status" role="status"><span aria-hidden="true">✓ </span>Transfer completed successfully</p>
    <TransferSummary accounts={accounts} transfer={transfer} />
    <dl className="receipt-reference"><dt>Transaction ID</dt><dd>{transfer.id}</dd></dl>
    <p className="muted">Keep this reference to identify both sides of your transfer.</p>
    <div className="form-actions"><a href={`#/accounts/${encodeURIComponent(transfer.sourceAccountId)}`}>View source transactions</a><a href="#/accounts">Back to accounts</a></div>
  </div>;
}
