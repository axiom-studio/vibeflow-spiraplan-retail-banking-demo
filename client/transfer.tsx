import { useRef, useState, type FormEvent } from 'react';
import type { Account, Transfer } from '../server/domain.js';
import type { TransferInput } from '../server/transfer-input.js';
import { request, useResource } from './api.js';
import { EmptyState, InlineAlert, LoadingState, MoneyText, PageHeader } from './components.js';
import { parseAmount } from './amount.js';

export function TransferPage({ sourceId = '' }: { sourceId?: string }) {
  const accounts = useResource<Account[]>('/api/accounts');
  if (accounts.loading) return <LoadingState />;
  if (accounts.error) return <InlineAlert message={accounts.error} retry={accounts.retry} />;
  if (!accounts.data || accounts.data.length < 2) return <><PageHeader title="Transfer money" /><EmptyState title="Two accounts are needed"><p>Transfers require two eligible accounts belonging to you.</p><a href="#/accounts">Back to accounts</a></EmptyState></>;
  return <TransferForm accounts={accounts.data} sourceId={sourceId} />;
}

function AccountPicker({ label, id, accounts, value, onChange, error }: { label: string; id: string; accounts: Account[]; value: string; onChange: (id: string) => void; error?: string }) {
  return <label htmlFor={id}>{label}<select id={id} value={value} onChange={event => onChange(event.target.value)} required aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>
    <option value="">Choose an account</option>{accounts.map(account => <option value={account.id} key={account.id}>{account.name} · {account.number.slice(-4)} · {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.balanceCents / 100)}</option>)}
  </select>{error && <span className="field-error" id={`${id}-error`}>{error}</span>}</label>;
}

function TransferForm({ accounts, sourceId }: { accounts: Account[]; sourceId: string }) {
  const [source, setSource] = useState(accounts.some(a => a.id === sourceId) ? sourceId : '');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState<TransferInput>();
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const submission = useRef<{ payload: string; key: string } | undefined>(undefined);

  function prepare(event: FormEvent) {
    event.preventDefault();
    const cents = parseAmount(amount);
    const invalid: Record<string, string> = {};
    const from = accounts.find(account => account.id === source);
    if (!from) invalid.source = 'Choose the account to transfer from.';
    if (!destination || destination === source) invalid.destination = 'Choose a different destination account.';
    if (cents === undefined) invalid.amount = 'Enter an amount of at least $0.01 with no more than two decimal places.';
    else if (from && cents > from.balanceCents) invalid.amount = 'This amount exceeds the available balance.';
    setErrors(invalid);
    if (Object.keys(invalid).length) { document.getElementById(Object.keys(invalid)[0])?.focus(); return; }
    const payload = JSON.stringify({ sourceAccountId: source, destinationAccountId: destination, amountCents: cents });
    if (submission.current?.payload !== payload) submission.current = { payload, key: crypto.randomUUID() };
    setReview({ sourceAccountId: source, destinationAccountId: destination, amountCents: cents!, idempotencyKey: submission.current!.key });
    setFailure('');
  }
  async function confirm() {
    if (!review || submitting.current) return;
    submitting.current = true; setBusy(true); setFailure('');
    try {
      const result = await request<Transfer>('/api/transfers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(review) });
      location.hash = `/transfer/receipt/${encodeURIComponent(result.id)}`;
    }
    catch (error) { setFailure(`${error instanceof Error ? error.message : 'Transfer could not be confirmed.'} Retry confirmation to safely check this same submission.`); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="transfer-page"><PageHeader title={review ? 'Review transfer' : 'Transfer money'} subtitle={review ? 'Check the details before you confirm.' : 'Move money between your accounts.'} />
    {review ? <><TransferSummary accounts={accounts} transfer={review} />{failure && <InlineAlert message={failure} />}<div className="form-actions"><button className="primary" onClick={confirm} disabled={busy}>{busy ? 'Transferring…' : 'Confirm transfer'}</button><button disabled={busy} onClick={() => { setReview(undefined); setFailure(''); }}>Edit</button></div></>
      : <form noValidate onSubmit={prepare} className="transfer-form">
        <AccountPicker label="From account" id="source" accounts={accounts} value={source} error={errors.source} onChange={value => { setSource(value); if (value === destination) { setDestination(''); setNotice('Choose a new destination; it cannot be the source account.'); } }} />
        <AccountPicker label="To account" id="destination" accounts={accounts.filter(account => account.id !== source)} value={destination} error={errors.destination} onChange={value => { setDestination(value); setNotice(''); }} />
        {notice && <p className="muted" role="status">{notice}</p>}
        <label htmlFor="amount">Amount (USD)<input id="amount" inputMode="decimal" autoComplete="off" value={amount} onChange={event => setAmount(event.target.value)} required aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'amount-error' : 'amount-help'} />{errors.amount ? <span className="field-error" id="amount-error">{errors.amount}</span> : <span id="amount-help">Minimum $0.01. No fees.</span>}</label>
        <div className="form-actions"><button className="primary" type="submit">Review transfer</button><a href="#/accounts">Cancel</a></div>
      </form>}
  </div>;
}

export function TransferSummary({ accounts, transfer }: { accounts: Account[]; transfer: Pick<TransferInput, 'sourceAccountId' | 'destinationAccountId' | 'amountCents'> }) {
  const label = (id: string) => { const account = accounts.find(item => item.id === id); return account ? `${account.name} · Account ending ${account.number.slice(-4)}` : 'Account unavailable'; };
  return <dl className="details"><div><dt>From</dt><dd>{label(transfer.sourceAccountId)}</dd></div><div><dt>To</dt><dd>{label(transfer.destinationAccountId)}</dd></div><div><dt>Amount</dt><dd><MoneyText cents={transfer.amountCents} /></dd></div></dl>;
}
