import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export function AppShell({ children, transfer = false }: PropsWithChildren<{ transfer?: boolean }>) {
  const main = useRef<HTMLElement>(null);
  return <><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a><header className="app-header"><div className="header-inner">
    <a className="brand" href="#/accounts"><span className="brand-mark" aria-hidden="true">a</span>Axiom<span className="brand-bank">Bank</span></a>
    <nav aria-label="Main navigation"><a href="#/accounts" aria-current={!transfer ? 'page' : undefined}>Accounts</a><a href="#/transfer" aria-current={transfer ? 'page' : undefined}>Transfer</a></nav>
    <span className="demo-label"><span aria-hidden="true" className="status-dot" />Demo · simulated funds</span>
  </div></header><main ref={main} id="main" className="page" tabIndex={-1}>{children}</main><footer className="app-footer">Axiom Bank demo <span>Fictional accounts. No real funds.</span></footer></>;
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [title]);
  return <div className="page-heading"><div><h1 ref={heading} tabIndex={-1}>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions}</div>;
}
export function MoneyText({ cents, signed = false }: { cents: number; signed?: boolean }) {
  return <span className={`money ${signed && cents > 0 ? 'positive' : ''}`}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: signed ? 'always' : 'auto' }).format(cents / 100)}</span>;
}
export function EmptyState({ title, children }: PropsWithChildren<{ title: string }>) {
  return <div className="empty-state"><h2>{title}</h2>{children}</div>;
}
export function InlineAlert({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="alert" role="alert"><p>{message}</p>{retry && <button onClick={retry}>Try again</button>}</div>;
}
export function LoadingState() {
  return <div className="loading" role="status" aria-label="Loading"><span>Loading your information…</span><div /><div /><div /></div>;
}
