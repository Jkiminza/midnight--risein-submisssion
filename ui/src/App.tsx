/**
 * Night Desk — React Web Interface
 *
 * A private invoicing ledger on the Midnight Network.
 * Amount and memo never reach the chain — the ledger only stores
 * the invoice id, its status and the creator's identity hash.
 * Statuses are read from the Preview indexer (no wallet needed).
 * Creating/accepting/settling/cancelling requires Lace.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { useInvoices, type InvoiceView } from './hooks/useInvoices';
import { BrowserNightDeskManager } from './contexts/BrowserNightDeskManager';
import { INVOICE_STATUS } from '../../api/src/common-types.js';
import pino from 'pino';

const NETWORK_ID = import.meta.env.VITE_NETWORK_ID ?? 'preview';
const DEFAULT_CONTRACT = import.meta.env.VITE_DEFAULT_CONTRACT ?? '';
const KNOWN_INVOICES_KEY = 'night-desk-invoices';

type WalletState = 'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

interface LocalInvoice {
  amount: string;
  memo: string;
  createdAt: string;
}

export function findWallet(): InitialAPI | undefined {
  const midnight = (window as any).midnight;
  if (!midnight) return undefined;
  return Object.values(midnight).find(
    (w): w is InitialAPI => !!w && typeof w === 'object' && 'apiVersion' in w,
  );
}

export function truncAddr(addr: string): string {
  return addr.length <= 24 ? addr : `${addr.slice(0, 14)}…${addr.slice(-8)}`;
}

export function decodeMemo(bytes: Uint8Array | string): string {
  if (typeof bytes === 'string') return bytes.replace(/\0/g, '').trim();
  return new TextDecoder().decode(bytes).replace(/\0/g, '').trim();
}

export function encodeMemo(memo: string): Uint8Array {
  const out = new Uint8Array(32);
  out.set(new TextEncoder().encode(memo).slice(0, 32));
  return out;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

function friendlyError(e: any): string {
  const msg = extractErrorMessage(e);
  if (msg.includes('User rejected')) return 'Transaction cancelled.';
  if (msg.includes('not the creator')) return 'Only the creator can cancel this invoice.';
  if (msg.includes('invoice not found')) return 'Invoice not found on the chain.';
  if (msg.includes('invoice not open')) return 'This invoice is no longer open.';
  if (msg.includes('invoice not accepted')) return 'This invoice has not been accepted yet.';
  if (msg.includes('amount must be non-zero')) return 'Enter an amount greater than zero.';
  if (msg.includes('memo required')) return 'A memo is required.';
  if (msg.includes('Failed to fetch') || msg.includes('Failed Proof Server')) return 'Could not reach the proof server. Check your connection and try again.';
  if (msg.includes('mismatched verifier keys')) return 'Contract version mismatch. Try deploying a new Night Desk contract.';
  if (msg.includes('not authorized')) return 'Wallet connection was rejected. Try connecting again.';
  if (msg.includes('insufficient') || msg.includes('DUST')) return 'Insufficient funds. Request tokens from the Preview faucet.';
  if (msg.includes('Network ID')) return 'Network configuration error. Make sure Lace is set to Preview.';
  if (msg.includes('shutdown') || msg.includes('Remote API')) return 'The Lace connection was interrupted. Unlock Lace, then reload the page and reconnect.';
  if (msg.includes('submission') || msg.includes('Submission')) return 'Transaction failed to submit. Please try again.';
  return msg || 'An unexpected error occurred. Check the browser console for details.';
}

function extractErrorMessage(e: any): string {
  if (!e) return '';
  if (e.message && e.message !== '') return e.message;
  const failure = e?.cause?.failure;
  if (failure?.message) return failure.message;
  if (failure?.cause?.message) return failure.cause.message;
  if (e?.cause?.message) return e.cause.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

const STATUS_META: Record<number, { label: string; icon: string; cls: string }> = {
  [INVOICE_STATUS.OPEN]: { label: 'Open', icon: '◐', cls: 'st-open' },
  [INVOICE_STATUS.ACCEPTED]: { label: 'Accepted', icon: '●', cls: 'st-accepted' },
  [INVOICE_STATUS.SETTLED]: { label: 'Settled', icon: '✔', cls: 'st-settled' },
  [INVOICE_STATUS.CANCELLED]: { label: 'Cancelled', icon: '◌', cls: 'st-cancelled' },
};

function getKnownInvoices(): Record<string, LocalInvoice> {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_INVOICES_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveKnownInvoice(id: string, invoice: LocalInvoice): void {
  const known = getKnownInvoices();
  known[id] = invoice;
  localStorage.setItem(KNOWN_INVOICES_KEY, JSON.stringify(known));
}

export default function App() {
  const [walletState, setWalletState] = useState<WalletState>('detecting');
  const [walletAPI, setWalletAPI] = useState<InitialAPI | undefined>();
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [joinInput, setJoinInput] = useState('');
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  const managerRef = useRef<BrowserNightDeskManager | null>(null);

  const getManager = useCallback(() => {
    if (!managerRef.current) {
      const logger = pino({ level: 'warn', browser: { asObject: true } });
      managerRef.current = new BrowserNightDeskManager(logger);
    }
    return managerRef.current;
  }, []);

  const { invoices, invoiceCount, loading, error: ledgerError, refresh } = useInvoices(contractAddress || null);
  const knownInvoices = getKnownInvoices();

  // ── Wallet detection ─────────────────────────────────────────────────

  useEffect(() => {
    const found = findWallet();
    if (found) { setWalletAPI(found); setWalletState('ready'); return; }
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 100;
      const w = findWallet();
      if (w) { setWalletAPI(w); setWalletState('ready'); clearInterval(t); }
      else if (elapsed >= 5_000) { setWalletState('no-wallet'); clearInterval(t); }
    }, 100);
    return () => clearInterval(t);
  }, []);

  // ── Wallet connect ───────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!walletAPI) return;
    setWalletState('connecting');
    setError(null);
    try {
      const c = await walletAPI.connect(NETWORK_ID);
      setWallet(c);
      const { unshieldedAddress } = await c.getUnshieldedAddress();
      setAddress(unshieldedAddress);
      setWalletState('connected');
    } catch (e) {
      setError(friendlyError(e));
      setWalletState('ready');
    }
  }, [walletAPI]);

  // ── Deploy / join ────────────────────────────────────────────────────

  const deployContract = useCallback(async () => {
    if (!wallet) return;
    setDeploying(true);
    setError(null);
    try {
      const manager = getManager();
      const deployment$ = manager.resolve();
      const result = await new Promise<any>((resolve, reject) => {
        const sub = deployment$.subscribe((d) => {
          if (d.status === 'deployed') { Promise.resolve().then(() => sub.unsubscribe()); resolve(d); }
          if (d.status === 'failed') { Promise.resolve().then(() => sub.unsubscribe()); reject(d.error); }
        });
      });
      setContractAddress(result.api.deployedContractAddress);
      setShowJoinPanel(false);
      await copyToClipboard(result.api.deployedContractAddress);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setDeploying(false);
    }
  }, [wallet, getManager]);

  const joinContract = useCallback(() => {
    const addr = joinInput.trim();
    if (!addr) return;
    if (!/^[0-9a-fA-F]{64}$/.test(addr)) {
      setError('Invalid contract address. Must be 64 hex characters.');
      return;
    }
    setContractAddress(addr);
    setShowJoinPanel(false);
    setJoinInput('');
  }, [joinInput]);

  const handleCopy = useCallback(async () => {
    if (!contractAddress) return;
    if (await copyToClipboard(contractAddress)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [contractAddress]);

  // ── Contract actions ─────────────────────────────────────────────────

  const resolveDeployment = useCallback(async (manager: BrowserNightDeskManager) => {
    return await new Promise<any>((resolve, reject) => {
      const deployment$ = manager.resolve((contractAddress || undefined) as any);
      const sub = deployment$.subscribe((d) => {
        if (d.status === 'deployed') { Promise.resolve().then(() => sub.unsubscribe()); resolve(d); }
        if (d.status === 'failed') { Promise.resolve().then(() => sub.unsubscribe()); reject(d.error); }
      });
    });
  }, [contractAddress]);

  const createInvoice = useCallback(async () => {
    if (!wallet) return;
    const amt = BigInt(amount.trim());
    if (amt <= 0n) { setError('Enter an amount greater than zero.'); return; }
    if (!memo.trim()) { setError('A memo is required.'); return; }
    setCreating(true);
    setCreateStatus('Joining contract…');
    setError(null);
    try {
      const manager = getManager();
      const result = await resolveDeployment(manager);
      setCreateStatus('Generating proof & submitting…');
      const entryId = await result.api.createInvoice(amt, encodeMemo(memo.trim()));
      saveKnownInvoice(String(entryId), {
        amount: amount.trim(),
        memo: memo.trim(),
        createdAt: new Date().toISOString(),
      });
      setCreateStatus(null);
      setAmount(''); setMemo('');
      setTimeout(() => refresh(), 3000);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setCreating(false);
      setCreateStatus(null);
    }
  }, [wallet, amount, memo, getManager, resolveDeployment, refresh]);

  const updateStatus = useCallback(async (id: number, action: 'accept' | 'settle' | 'cancel') => {
    if (!wallet) return;
    setActionBusy(id);
    setError(null);
    try {
      const manager = getManager();
      const result = await resolveDeployment(manager);
      if (action === 'accept') await result.api.acceptInvoice(id);
      else if (action === 'settle') await result.api.settleInvoice(id);
      else await result.api.cancelInvoice(id);
      setTimeout(() => refresh(), 3000);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setActionBusy(null);
    }
  }, [wallet, getManager, resolveDeployment, refresh]);

  // ── Render ───────────────────────────────────────────────────────────

  const isConnected = walletState === 'connected';
  const selected: InvoiceView | undefined = invoices.find((i) => i.id === selectedId);
  const selectedLocal = selected ? knownInvoices[String(selected.id)] : undefined;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <img src="/night-desk-logo.png" alt="Night Desk Logo" className="logo-image" />
          <span className="title"></span>
        </div>
        <div className="header-right">
          {isConnected && address ? (
            <div className="chip"><span className="dot" />{truncAddr(address)}</div>
          ) : walletState === 'detecting' || walletState === 'connecting' ? (
            <div className="chip muted"><span className="spinner" />{walletState === 'detecting' ? 'Detecting…' : 'Connecting…'}</div>
          ) : walletState === 'no-wallet' ? (
            <a className="chip warn" href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk" target="_blank" rel="noopener noreferrer">Install Lace →</a>
          ) : (
            <button className="btn-connect" onClick={connect}>Connect Wallet</button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-bar"><span>{error}</span><button onClick={() => setError(null)}>✕</button></div>
      )}

      <main className="layout">
        <div className="col">
          <section className="card contract-card">
            <div className="contract-bar">
              <div className="contract-label">Contract</div>
              <button className="contract-addr" onClick={handleCopy} title={`Click to copy: ${contractAddress || 'none yet'}`}>
                <span className="mono">{contractAddress ? truncAddr(contractAddress) : 'not deployed'}</span>
                <span className="copy-icon">{copied ? '✓' : '⎘'}</span>
              </button>
              <button className="btn-text" onClick={() => setShowJoinPanel(!showJoinPanel)}>
                {showJoinPanel ? 'Cancel' : 'Switch'}
              </button>
            </div>

            {showJoinPanel && (
              <div className="join-panel">
                <input className="input" type="text" placeholder="Contract address (64 hex chars)"
                  value={joinInput} onChange={(e) => setJoinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinContract()} />
                <div className="join-row">
                  <button className="btn-primary" onClick={joinContract} disabled={!joinInput.trim()}>
                    Join Contract
                  </button>
                  {isConnected ? (
                    <button className="btn-secondary" onClick={deployContract} disabled={deploying}>
                      {deploying ? <><span className="spinner" /> Deploying…</> : 'Deploy New'}
                    </button>
                  ) : (
                    <button className="btn-secondary" onClick={connect} disabled={walletState !== 'ready'}>
                      Connect to Deploy
                    </button>
                  )}
                </div>
              </div>
            )}

            <h2>New Invoice</h2>
            <p className="dim">Amount and memo are private — they are bound into the proof and never written to the ledger.</p>

            <div className="form">
              <input className="input mono" type="text" inputMode="numeric" placeholder="Amount (your currency)"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input className="input" type="text" placeholder="Memo (max 32 chars)" maxLength={32}
                value={memo} onChange={(e) => setMemo(e.target.value)} />
              <div className="privacy-hint"><span>🔒</span> only you can see this amount</div>
              {isConnected ? (
                <button className="btn-primary" onClick={createInvoice}
                  disabled={creating || !amount.trim() || !memo.trim()}>
                  {creating ? <><span className="spinner" /> {createStatus}</> : 'Create Invoice'}
                </button>
              ) : (
                <button className="btn-primary" onClick={connect} disabled={walletState !== 'ready'}>
                  {walletState === 'no-wallet' ? 'Install Lace to Create' : 'Connect Wallet to Create'}
                </button>
              )}
            </div>
          </section>

          <section className="card ledger-card">
            <div className="ledger-head">
              <h2>Public Ledger</h2>
              <span className="dim mono">{invoiceCount} issued {invoiceCount === 1 ? 'invoice' : 'invoices'}</span>
            </div>

            {ledgerError ? (
              <div className="lb-empty"><p className="dim">Ledger error: {ledgerError}</p></div>
            ) : invoices.length === 0 ? (
              <div className="lb-empty">
                {loading ? <p className="dim"><span className="spinner" /> Reading ledger…</p> : <p className="dim">No invoices on this contract yet. The ledger is empty.</p>}
              </div>
            ) : (
              <div className="lb-table">
                <div className="lb-row lb-head">
                  <span className="lb-id">ID</span>
                  <span className="lb-status">Status</span>
                  <span className="lb-amount">Amount</span>
                  <span className="lb-memo">Memo</span>
                </div>
                {invoices.map((inv) => {
                  const meta = STATUS_META[inv.status] ?? STATUS_META[INVOICE_STATUS.OPEN];
                  const local = knownInvoices[String(inv.id)];
                  return (
                    <button key={inv.id} className={`lb-row lb-row-btn ${selectedId === inv.id ? 'lb-active' : ''}`}
                      onClick={() => setSelectedId(selectedId === inv.id ? null : inv.id)}>
                      <span className="lb-id mono">#{inv.id}</span>
                      <span className="lb-status"><span className={`status-badge ${meta.cls}`}>{meta.label}</span></span>
                      <span className="lb-amount mono">{local ? local.amount : '••••'}</span>
                      <span className="lb-memo dim">{local ? decodeMemo(local.memo) : '— private —'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card detail-card">
            <div className="ledger-head">
              <h2>Invoice Detail</h2>
              {selected && <span className="dim mono">known by your wallet: {selectedLocal ? 'yes' : 'no'}</span>}
            </div>

            {!selected ? (
              <div className="lb-empty"><p className="dim">Select an invoice from the ledger to inspect it. Amounts you created stay in your wallet — everyone else sees redacted entries.</p></div>
            ) : (
              <div className="detail-body">
                <div className="detail-grid">
                  <div className="detail-kv"><span className="dim">Invoice</span><span className="mono">#{selected.id}</span></div>
                  <div className="detail-kv"><span className="dim">Status</span><span className={`status-badge ${STATUS_META[selected.status].cls}`}>{STATUS_META[selected.status].label}</span></div>
                  <div className="detail-kv"><span className="dim">Amount</span><span className="mono">{selectedLocal ? selectedLocal.amount : '•••••• (private)'}</span></div>
                  <div className="detail-kv"><span className="dim">Memo</span><span>{selectedLocal ? decodeMemo(selectedLocal.memo) : 'Private memo — visible only to the parties. Share it off-chain.'}</span></div>
                </div>

                <div className="flow-list">
                  <div className={`flow-step ${selected.status >= INVOICE_STATUS.OPEN ? 'on' : ''}`}>
                    <span className="flow-node">→</span><span>Created</span>
                    <span className={`status-dot st-open`} />
                  </div>
                  <div className={`flow-step ${selected.status >= INVOICE_STATUS.ACCEPTED ? 'on' : ''}`}>
                    <span className="flow-node">→</span><span>Accepted by payee</span>
                    <span className={`status-dot st-accepted`} />
                  </div>
                  <div className={`flow-step ${selected.status >= INVOICE_STATUS.SETTLED ? 'on' : ''}`}>
                    <span className="flow-node">→</span><span>Settled</span>
                    <span className={`status-dot st-settled`} />
                  </div>
                </div>

                <div className="actions">
                  {selected.status === INVOICE_STATUS.OPEN && (
                    <>
                      <button className="btn-primary btn-sm" onClick={() => updateStatus(selected.id, 'accept')}
                        disabled={!isConnected || actionBusy !== null}>
                        {actionBusy === selected.id ? <span className="spinner" /> : 'Accept'}
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => updateStatus(selected.id, 'cancel')}
                        disabled={!isConnected || actionBusy !== null}>
                        {actionBusy === selected.id ? <span className="spinner" /> : 'Cancel'}
                      </button>
                    </>
                  )}
                  {selected.status === INVOICE_STATUS.ACCEPTED && (
                    <button className="btn-primary btn-sm" onClick={() => updateStatus(selected.id, 'settle')}
                      disabled={!isConnected || actionBusy !== null}>
                      {actionBusy === selected.id ? <span className="spinner" /> : 'Settle'}
                    </button>
                  )}
                  {selected.status === INVOICE_STATUS.SETTLED && <p className="dim small">Settled. Funds should change hands off-chain per the memo.</p>}
                  {selected.status === INVOICE_STATUS.CANCELLED && <p className="dim small">This invoice was cancelled by its creator on the ledger.</p>}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        <span>Built on <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">Midnight</a> · Preview</span>
        <span className="dim mono">{NETWORK_ID}</span>
      </footer>
    </div>
  );
}