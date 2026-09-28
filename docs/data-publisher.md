# Publishing fictional test data

Run `npm run data:publish -- --file fixtures/example.json`. Set `DATABASE_PATH` to choose a database (default `data/banking.sqlite`). Add `--dry-run` to validate without persisting rows; a nonexistent target uses an in-memory database for the preview. Exit status is nonzero on any invalid batch.

The version-1 JSON envelope accepts `users`, `accounts` and `transactions` arrays. Copy `fixtures/example.json` for complete examples. IDs are stable, 1–80 alphanumeric/underscore/hyphen characters. Users have ID/name. Accounts reference `userId`, include type (Checking/Savings/Investment), a numeric fictional account number, USD currency and nonnegative integer `openingBalanceCents`. Transactions reference both owner and account, use ISO timestamps with timezone, integer signed cents, Debit/Credit type, Income/Shopping/Bills/Other category, description and optional notes.

Only publish fictional data. A new transaction changes its account balance by its signed cents exactly once. Re-importing identical IDs/content skips existing records; changed content under an existing ID rejects the entire batch. Unknown owners/accounts, duplicate IDs, mismatched signs, unsafe cents or negative resulting balances also roll back the entire batch. Opening balance is immutable import metadata, separate from current balance.

To add transactions for an existing customer, omit users/accounts and include the new transactions array. To add a customer, include that user and their accounts in one batch. Configure `DEMO_USER_ID` when starting the app to browse that customer's isolated accounts. Reload and restart preserve data. The application seeds `fixtures/example.json` only when there are no users.

The CLI connects directly through the same repository boundary as the app; it does not expose an administration endpoint. Docker invocation will be provided by the container delivery ticket. Transfer pairs are created through the app's transfer service, not arbitrary fixture entries, so ledger invariants stay intact.
