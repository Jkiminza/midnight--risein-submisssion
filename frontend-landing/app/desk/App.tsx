/**
 * Night Desk — React Web Interface
 *
 * A private invoicing ledger on the Midnight Network.
 * Amount and memo never reach the chain — the ledger only stores
 * the invoice id, its status and the creator's identity hash.
 * Statuses are read from the Preview indexer (no wallet needed).
 * Creating/accepting/settling/cancelling requires Lace.
 */

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
    (w): w is InitialAPI => !!w && typeof w === 'object' && typeof (w as InitialAPI).connect === 'function',
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

// ── Inline icons (lucide-style strokes) ──────────────────────────────────

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const WalletIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></Icon>
);
const CopyIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}><rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Icon>
);
const FileTextIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></Icon>
);
const ListIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Icon>
);
const ReceiptIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></Icon>
);
const LockIcon = ({ size = 19 }: { size?: number }) => (
  <Icon size={size}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>
);
const ShieldIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></Icon>
);

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
  const [view, setView] = useState<'ledger' | 'detail' | 'invoice'>('invoice');

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

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress(null);
    setWalletState('ready');
    getManager().disconnect();
  }, [getManager]);

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
        </div>
        <div className="header-center">
          <span className="header-network">
            <span className="header-dot">•</span>
            <span className="faint">net</span> preview
          </span>
        </div>
        <div className="header-right">
          {isConnected && address ? (
            <div className="chip"><span className="dot" />{truncAddr(address)}<button className="chip-disconnect" onClick={disconnect} title="Disconnect wallet" aria-label="Disconnect wallet">⏻</button></div>
          ) : walletState === 'detecting' || walletState === 'connecting' ? (
            <div className="chip muted"><span className="spinner" />{walletState === 'detecting' ? 'Detecting…' : 'Connecting…'}</div>
          ) : walletState === 'no-wallet' ? (
            <a className="chip warn" href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk" target="_blank" rel="noopener noreferrer">Install Lace →</a>
          ) : (
            <button className="btn-connect" onClick={connect}>Connect Wallet</button>
          )}
        </div>
      </header>
      <div className="header-divider"></div>

      <section className="hero-section">
        <div className="hero-breadcrumb">
          <span className="breadcrumb-dot">•</span>
          <span>Private invoicing</span>
          <span className="breadcrumb-dot">•</span>
          <span>Midnight Preview</span>
          <span className="breadcrumb-dot">•</span>
          <span>Ledger v8</span>
        </div>
        <h1 className="hero-title">Private invoicing, without the exposure.</h1>
        <p className="hero-subtitle">Create invoices using zero-knowledge proofs. Your amount, memo, and payment details stay on this device — only the status reaches the ledger.</p>
      </section>
      <div className="hero-divider"></div>

      {error && (
        <div className="error-bar"><span>{error}</span><button onClick={() => setError(null)}>✕</button></div>
      )}

      <section className="requirements-section">
        <div className="requirements-text">
          <span className="requirements-dot">•</span>
          <span className="requires">Requires</span>
          <span>Midnight</span>
          <span className="bold">Lace</span>
          <span>on</span>
          <span className="bold underline">Preview</span>
          <span>funded with</span>
          <span className="bold">tNight</span>
        </div>
      </section>

      <main className="layout single">
        <div className="col">
          <section className="workspace">
            {/* Contract header */}
            <div className="ws-contract">
              <div className="ws-contract-left">
                <span className="ws-icon"><WalletIcon /></span>
                <div className="ws-contract-group">
                  <span className="ws-label">Contract</span>
                  <button className="ws-addr" onClick={handleCopy} title={`Click to copy: ${contractAddress || 'none yet'}`}>
                    <span className="mono">{contractAddress ? truncAddr(contractAddress) : 'not deployed'}</span>
                    <CopyIcon />
                  </button>
                  <button className="ws-btn-text" onClick={() => setShowJoinPanel(!showJoinPanel)}>
                    {showJoinPanel ? 'Cancel' : 'Switch'}
                  </button>
                </div>
              </div>
              <div className={`ws-status ${contractAddress ? '' : 'off'}`}>
                <span className="ws-dot" />
                <span>{contractAddress ? 'Connected' : 'No contract'}</span>
              </div>
            </div>

            {showJoinPanel && (
              <div className="join-panel">
                <input className="input" type="text" placeholder="Contract address (64 hex chars)"
                  value={joinInput} onChange={(e) => setJoinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinContract()} />
                <div className="join-row">
                  <button className="btn-primary" onClick={joinContract} disabled={!joinInput.trim()}>Join Contract</button>
                  {isConnected ? (
                    <button className="btn-secondary" onClick={deployContract} disabled={deploying}>
                      {deploying ? <><span className="spinner" /> Deploying…</> : 'Deploy New'}
                    </button>
                  ) : (
                    <button className="btn-secondary" onClick={connect} disabled={walletState !== 'ready'}>Connect to Deploy</button>
                  )}
                </div>
              </div>
            )}

            {/* Segmented toggle */}
            <div className="view-tabs" role="tablist">
              <button role="tab" aria-selected={view === 'invoice'}
                className={`view-tab ${view === 'invoice' ? 'on' : ''}`} onClick={() => setView('invoice')}>
                <FileTextIcon /><span>New Invoice</span>
              </button>
              <button role="tab" aria-selected={view === 'ledger'}
                className={`view-tab ${view === 'ledger' ? 'on' : ''}`} onClick={() => setView('ledger')}>
                <ListIcon /><span>Public Ledger</span>
              </button>
              <button role="tab" aria-selected={view === 'detail'}
                className={`view-tab ${view === 'detail' ? 'on' : ''}`} onClick={() => setView('detail')}>
                <ReceiptIcon /><span>Invoice Detail</span>
              </button>
            </div>

            {view === 'invoice' && (
              <section className="nested-panel">
                <div className="inv-form-head">
                  <span className="inv-form-icon"><LockIcon /></span>
                  <div>
                    <h2>Create private invoice</h2>
                    <p>Amount and memo are private — bound into the proof and never written to the ledger.</p>
                  </div>
                </div>

                <div className="inv-grid">
                  <div className="inv-field">
                    <label>Amount</label>
                    <input className="input-lg" type="text" inputMode="numeric" placeholder="e.g. 1000"
                      value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="inv-field">
                    <label>Memo</label>
                    <input className="input-lg" type="text" placeholder="Add a note…" maxLength={32}
                      value={memo} onChange={(e) => setMemo(e.target.value)} />
                  </div>
                </div>

                <div className="inv-privacy"><ShieldIcon /><p>This information is encrypted and never leaves your device.</p></div>

                <div className="inv-cta">
                  {isConnected ? (
                    <button className="btn-pill" onClick={createInvoice} disabled={creating || !amount.trim() || !memo.trim()}>
                      {creating ? <span className="spinner" /> : null}
                      {creating ? createStatus : 'Create Invoice'}
                      {!creating && <span className="inv-arrow">→</span>}
                    </button>
                  ) : (
                    <button className="btn-pill" onClick={connect} disabled={walletState !== 'ready'}>
                      {walletState === 'no-wallet' ? 'Install Lace to Create' : 'Connect Wallet to Create'}
                      <span className="inv-arrow">→</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {view === 'ledger' && (
              <section className="nested-panel">
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
                          onClick={() => {
                            if (selectedId === inv.id) { setSelectedId(null); setView('ledger'); }
                            else { setSelectedId(inv.id); setView('detail'); }
                          }}>
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
            )}

            {view === 'detail' && (
              <section className="nested-panel">
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
                          <button className="btn-primary btn-sm" onClick={() => updateStatus(selected.id, 'accept')} disabled={!isConnected || actionBusy !== null}>
                            {actionBusy === selected.id ? <span className="spinner" /> : 'Accept'}
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => updateStatus(selected.id, 'cancel')} disabled={!isConnected || actionBusy !== null}>
                            {actionBusy === selected.id ? <span className="spinner" /> : 'Cancel'}
                          </button>
                        </>
                      )}
                      {selected.status === INVOICE_STATUS.ACCEPTED && (
                        <button className="btn-primary btn-sm" onClick={() => updateStatus(selected.id, 'settle')} disabled={!isConnected || actionBusy !== null}>
                          {actionBusy === selected.id ? <span className="spinner" /> : 'Settle'}
                        </button>
                      )}
                      {selected.status === INVOICE_STATUS.SETTLED && <p className="dim small">Settled. Funds should change hands off-chain per the memo.</p>}
                      {selected.status === INVOICE_STATUS.CANCELLED && <p className="dim small">This invoice was cancelled by its creator on the ledger.</p>}
                    </div>
                  </div>
                )}
              </section>
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