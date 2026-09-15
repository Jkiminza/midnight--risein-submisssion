'use client'

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
import { Copy, FileText, List, LockKeyhole, Receipt, ShieldCheck, Wallet, LogOut, Loader2, ChevronRight } from 'lucide-react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { useInvoices, type InvoiceView } from './hooks/useInvoices';
import { BrowserNightDeskManager } from './contexts/BrowserNightDeskManager';
import { INVOICE_STATUS } from '../../../api/dist/common-types.js';
import pino from 'pino';
import './globals.css';

const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID ?? 'preview';
const DEFAULT_CONTRACT = process.env.NEXT_PUBLIC_DEFAULT_CONTRACT ?? '';
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

const STATUS_META: Record<number, { label: string; cls: string; dot: string }> = {
  [INVOICE_STATUS.OPEN]: {
    label: 'Open',
    cls: 'bg-[#FFF4E5] text-[#B45309]',
    dot: 'bg-[#F59E0B]',
  },
  [INVOICE_STATUS.ACCEPTED]: {
    label: 'Accepted',
    cls: 'bg-[#E8F1FE] text-[#1D4ED8]',
    dot: 'bg-[#3B82F6]',
  },
  [INVOICE_STATUS.SETTLED]: {
    label: 'Settled',
    cls: 'bg-[#E7F6EF] text-[#166534]',
    dot: 'bg-[#35B86B]',
  },
  [INVOICE_STATUS.CANCELLED]: {
    label: 'Cancelled',
    cls: 'bg-[#EEF0F5] text-[#6B7280]',
    dot: 'bg-[#9CA3AF]',
  },
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

export default function DeskPage() {
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
  const [view, setView] = useState<'invoice' | 'ledger' | 'detail'>('invoice');

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

  // ── Deployment helper ───────────────────────────────────────────────

  const resolveDeployment = useCallback(async (manager: BrowserNightDeskManager) => {
    const deployment$ = manager.resolve((contractAddress || undefined) as any);
    const result = await new Promise<any>((resolve, reject) => {
      const sub = deployment$.subscribe((d) => {
        if (d.status === 'deployed') { Promise.resolve().then(() => sub.unsubscribe()); resolve(d); }
        if (d.status === 'failed') { Promise.resolve().then(() => sub.unsubscribe()); reject(d.error); }
      });
    });
    return result;
  }, [contractAddress]);

  // ── Deploy / join ────────────────────────────────────────────────────

  const deployContract = useCallback(async () => {
    if (!wallet) return;
    setDeploying(true);
    setError(null);
    try {
      const manager = getManager();
      const result = await resolveDeployment(manager);
      setContractAddress(result.api.deployedContractAddress);
      setShowJoinPanel(false);
      await copyToClipboard(result.api.deployedContractAddress);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setDeploying(false);
    }
  }, [wallet, getManager, resolveDeployment]);

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

  // ── Invoice operations ───────────────────────────────────────────────

  const createInvoice = useCallback(async () => {
    if (!wallet) return;
    setCreating(true);
    setCreateStatus('Generating proof…');
    setError(null);
    try {
      const manager = getManager();
      const result = await resolveDeployment(manager);
      setCreateStatus('Generating proof & submitting…');
      const amt = amount.trim();
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

  // ── Derived state ────────────────────────────────────────────────────

  const isConnected = walletState === 'connected';
  const selected: InvoiceView | undefined = invoices.find((i) => i.id === selectedId);
  const selectedLocal = selected ? knownInvoices[String(selected.id)] : undefined;

  const statusPill = contractAddress
    ? <><span className="h-2 w-2 rounded-full bg-[#35B86B]" />Connected</>
    : <><span className="h-2 w-2 rounded-full bg-[#C7CBD9]" />No contract</>;

  const walletChip = isConnected && address ? (
    <div className="flex items-center gap-2 rounded-full border border-[#D9DCF0] bg-[#F7F7FD] px-3.5 py-2 font-mono text-xs font-medium text-[#29375F]">
      <span className="h-2 w-2 rounded-full bg-[#35B86B]" />
      {truncAddr(address)}
      <button type="button" onClick={disconnect} aria-label="Disconnect wallet" className="text-[#8A91A9] transition hover:text-[#29375F]">
        <LogOut size={14} />
      </button>
    </div>
  ) : walletState === 'detecting' || walletState === 'connecting' ? (
    <div className="flex items-center gap-2 rounded-full border border-[#D9DCF0] bg-[#F7F7FD] px-3.5 py-2 text-xs font-semibold text-[#69728C]">
      <Loader2 size={14} className="animate-spin" />
      {walletState === 'detecting' ? 'Detecting wallet…' : 'Connecting…'}
    </div>
  ) : walletState === 'no-wallet' ? (
    <a href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk" target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#FF6A00] px-4 py-2 text-xs font-semibold text-[#111827] shadow-[0_4px_14px_rgba(255,106,0,0.25)]">
      Install Lace <ChevronRight size={14} />
    </a>
  ) : (
    <button type="button" onClick={connect}
      className="inline-flex items-center gap-2 rounded-full bg-[#29375F] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1F2C50]">
      <Wallet size={14} /> Connect Wallet
    </button>
  );

  const tabButton = (id: 'invoice' | 'ledger' | 'detail', label: string, IconComp: typeof FileText) => (
    <button type="button" onClick={() => setView(id)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
        view === id
          ? 'bg-[#FF6A00] font-semibold text-[#111827] shadow-[0_6px_18px_rgba(255,106,0,0.20)]'
          : 'text-[#69728C] hover:bg-white/50 hover:text-[#29375F]'
      }`}>
      <IconComp size={16} strokeWidth={1.8} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F0F1F8] text-[#1F2C50]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/night-desk-logo.png" alt="Night Desk Logo" className="h-9 w-auto" />
          <span className="hidden text-sm font-semibold text-[#29375F] sm:block">Night Desk</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-[#E9EBF7] px-3 py-1.5 text-xs font-semibold text-[#52657F] md:block">
            <span className="mr-1.5 text-[#35B86B]">●</span>preview
          </span>
          {walletChip}
        </div>
      </header>

      {/* ── Error bar ──────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-auto mb-0 flex max-w-6xl items-center justify-between gap-4 rounded-[16px] border border-[#F4C7C7] bg-[#FDECEC] px-4 py-3 text-sm text-[#8C2F2F]">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold text-[#8C2F2F]/70 hover:text-[#8C2F2F]">✕</button>
        </div>
      )}

      {/* ── Main workspace ─────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-2 pb-16 sm:px-6">
        <section className="w-full">
          <div className="rounded-[28px] border border-[#D9DCF0] bg-[#F7F7FD]/90 p-4 shadow-[0_18px_50px_rgba(45,55,100,0.08)] sm:p-5 md:p-6">

            {/* Contract header */}
            <div className="flex flex-col gap-4 border-b border-[#E1E3F0] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF0FA] text-[#29375F]">
                  <Wallet size={18} strokeWidth={1.8} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A829D]">Contract</span>
                  <span className="font-mono text-sm font-medium text-[#29375F]">
                    {contractAddress ? truncAddr(contractAddress) : 'not deployed'}
                  </span>
                  <button type="button" onClick={handleCopy} aria-label="Copy contract address"
                    className="text-[#8A91A9] transition hover:text-[#29375F]">
                    {copied ? <span className="text-[#35B86B]">✓</span> : <Copy size={14} />}
                  </button>
                  <button type="button" onClick={() => setShowJoinPanel(!showJoinPanel)}
                    className="text-sm font-medium text-[#596581] transition hover:text-[#29375F]">
                    {showJoinPanel ? 'Cancel' : 'Switch'}
                  </button>
                </div>
              </div>
              <div className={`flex w-fit items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${contractAddress ? 'bg-[#EEF7F1] text-[#52675A]' : 'bg-[#EEF0F5] text-[#6B7280]'}`}>
                {statusPill}
              </div>
            </div>

            {showJoinPanel && (
              <div className="mt-5 rounded-[20px] border border-[#E1E3F0] bg-white p-4">
                <label className="mb-2 block text-sm font-medium text-[#33405F]">Contract address (64 hex chars)</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input type="text" placeholder="ca117f7f…476559b7" value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && joinContract()}
                    className="h-[48px] min-w-0 flex-1 rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] px-4 font-mono text-sm text-[#29375F] outline-none transition placeholder:text-[#A1A7BA] focus:border-[#FF6A00] focus:ring-4 focus:ring-[#FF6A00]/10" />
                  <div className="flex gap-3">
                    <button type="button" onClick={joinContract} disabled={!joinInput.trim()}
                      className="inline-flex h-[48px] items-center justify-center rounded-full bg-[#29375F] px-6 text-sm font-semibold text-white transition hover:bg-[#1F2C50] disabled:opacity-40">
                      Join Contract
                    </button>
                    {isConnected ? (
                      <button type="button" onClick={deployContract} disabled={deploying}
                        className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full border border-[#FF6A00] bg-[#FFF0E7] px-6 text-sm font-semibold text-[#B84A00] transition hover:bg-[#FFE4D1] disabled:opacity-40">
                        {deploying ? <Loader2 size={15} className="animate-spin" /> : null}
                        {deploying ? 'Deploying…' : 'Deploy New'}
                      </button>
                    ) : (
                      <button type="button" onClick={connect} disabled={walletState !== 'ready'}
                        className="inline-flex h-[48px] items-center justify-center rounded-full border border-[#D9DCF0] px-6 text-sm font-semibold text-[#394563] transition hover:bg-[#EEF0FA] disabled:opacity-40">
                        Connect to Deploy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mt-5 flex w-full items-center rounded-full bg-[#E9EBF7] p-1">
              {tabButton('invoice', 'New Invoice', FileText)}
              {tabButton('ledger', 'Public Ledger', List)}
              {tabButton('detail', 'Invoice Detail', Receipt)}
            </div>

            {/* ── New Invoice ─────────────────────────────────────────── */}
            {view === 'invoice' && (
              <div className="mt-5 rounded-[24px] border border-[#E1E3F0] bg-[#FBFBFE] p-5 sm:p-6 md:p-7">
                <div className="mb-7 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0E7] text-[#FF6A00]">
                    <LockKeyhole size={19} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">Create private invoice</h2>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#69728C]">
                      Amount and memo are private — they are bound into the proof and never written to the ledger.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#33405F]">Amount</label>
                    <div className="flex h-[56px] overflow-hidden rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] transition focus-within:border-[#FF6A00] focus-within:ring-4 focus-within:ring-[#FF6A00]/10">
                      <input type="text" inputMode="numeric" placeholder="e.g. 1000" value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-[#29375F] outline-none placeholder:text-[#A1A7BA]" />
                      <button type="button" className="flex items-center gap-2 border-l border-[#D8DCEF] px-4 text-sm font-semibold text-[#394563]">
                        USD <span className="text-xs text-[#8A91A9]">▾</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#33405F]">
                      Memo <span className="font-normal text-[#9298AB]">(optional)</span>
                    </label>
                    <input type="text" placeholder="Add a note…" maxLength={32} value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      className="h-[56px] w-full rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] px-4 text-sm text-[#29375F] outline-none transition placeholder:text-[#A1A7BA] focus:border-[#FF6A00] focus:ring-4 focus:ring-[#FF6A00]/10" />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-[14px] bg-[#F0F1FA] px-4 py-3.5">
                  <ShieldCheck size={18} strokeWidth={1.8} className="shrink-0 text-[#64708F]" />
                  <p className="text-xs leading-5 text-[#69728C]">This information is encrypted and never leaves your device.</p>
                </div>

                <div className="mt-6 flex justify-end">
                  {isConnected ? (
                    <button type="button" onClick={createInvoice}
                      disabled={creating || !amount.trim() || !memo.trim()}
                      className="inline-flex h-[48px] items-center gap-3 rounded-full bg-[#FF6A00] px-7 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(255,106,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,106,0,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                      {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                      {creating ? createStatus : 'Create Invoice'}
                      {!creating && <span className="text-base">→</span>}
                    </button>
                  ) : (
                    <button type="button" onClick={connect}
                      disabled={walletState !== 'ready'}
                      className="inline-flex h-[48px] items-center gap-3 rounded-full bg-[#FF6A00] px-7 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(255,106,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,106,0,0.25)] active:translate-y-0">
                      {walletState === 'no-wallet' ? 'Install Lace to Create' : 'Connect Wallet to Create'}
                      <span className="text-base">→</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Public Ledger ────────────────────────────────────────── */}
            {view === 'ledger' && (
              <div className="mt-5 rounded-[24px] border border-[#E1E3F0] bg-[#FBFBFE] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">Public Ledger</h2>
                  <span className="font-mono text-sm text-[#9298AB]">
                    {invoiceCount} issued {invoiceCount === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>

                {ledgerError ? (
                  <div className="rounded-[14px] bg-[#FDECEC] px-4 py-6 text-center text-sm text-[#8C2F2F]">
                    Ledger error: {ledgerError}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="rounded-[14px] bg-[#F0F1FA] px-4 py-10 text-center text-sm text-[#69728C]">
                    {loading ? (
                      <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Reading ledger…</span>
                    ) : 'No invoices on this contract yet. The ledger is empty.'}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[16px] border border-[#E1E3F0]">
                    <div className="flex items-center gap-3 border-b border-[#E1E3F0] bg-[#F0F1FA] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#7A829D]">
                      <span className="w-12">ID</span>
                      <span className="w-24">Status</span>
                      <span className="w-24">Amount</span>
                      <span className="min-w-0 flex-1">Memo</span>
                    </div>
                    {invoices.map((inv) => {
                      const meta = STATUS_META[inv.status] ?? STATUS_META[INVOICE_STATUS.OPEN];
                      const local = knownInvoices[String(inv.id)];
                      return (
                        <button key={inv.id} type="button"
                          onClick={() => {
                            if (selectedId === inv.id) { setSelectedId(null); setView('ledger'); }
                            else { setSelectedId(inv.id); setView('detail'); }
                          }}
                          className={`flex w-full items-center gap-3 border-b border-[#E1E3F0] px-4 py-3.5 text-left transition last:border-b-0 hover:bg-[#F7F8FD] ${selectedId === inv.id ? 'bg-[#F0F1FA]' : 'bg-white'}`}>
                          <span className="w-12 font-mono text-sm text-[#29375F]">#{inv.id}</span>
                          <span className="w-24"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></span>
                          <span className="w-24 font-mono text-sm text-[#29375F]">{local ? local.amount : '••••'}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-[#69728C]">{local ? decodeMemo(local.memo) : '— private —'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Invoice Detail ───────────────────────────────────────── */}
            {view === 'detail' && (
              <div className="mt-5 rounded-[24px] border border-[#E1E3F0] bg-[#FBFBFE] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">Invoice Detail</h2>
                  {selected && <span className="font-mono text-sm text-[#9298AB]">known by your wallet: {selectedLocal ? 'yes' : 'no'}</span>}
                </div>

                {!selected ? (
                  <div className="rounded-[14px] bg-[#F0F1FA] px-4 py-10 text-center text-sm text-[#69728C]">
                    Select an invoice from the ledger to inspect it. Amounts you created stay in your wallet — everyone else sees redacted entries.
                  </div>
                ) : (
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[16px] border border-[#E1E3F0] bg-white p-4">
                        <span className="text-xs font-medium text-[#9298AB]">Invoice</span>
                        <span className="mt-1 block font-mono text-sm font-medium text-[#29375F]">#{selected.id}</span>
                      </div>
                      <div className="rounded-[16px] border border-[#E1E3F0] bg-white p-4">
                        <span className="text-xs font-medium text-[#9298AB]">Status</span>
                        <span className="mt-1.5 block">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META[selected.status].cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[selected.status].dot}`} />{STATUS_META[selected.status].label}
                          </span>
                        </span>
                      </div>
                      <div className="rounded-[16px] border border-[#E1E3F0] bg-white p-4">
                        <span className="text-xs font-medium text-[#9298AB]">Amount</span>
                        <span className="mt-1 block font-mono text-sm font-medium text-[#29375F]">{selectedLocal ? selectedLocal.amount : '•••••• (private)'}</span>
                      </div>
                      <div className="rounded-[16px] border border-[#E1E3F0] bg-white p-4">
                        <span className="text-xs font-medium text-[#9298AB]">Memo</span>
                        <span className="mt-1 block text-sm text-[#29375F]">{selectedLocal ? decodeMemo(selectedLocal.memo) : 'Private memo — visible only to the parties. Share it off-chain.'}</span>
                      </div>
                    </div>

                    <div className="mt-6 flow-list">
                      <div className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 ${selected.status >= INVOICE_STATUS.OPEN ? 'border-[#FFE4D1] bg-[#FFF4EC]' : 'border-[#E1E3F0] bg-white opacity-60'}`}>
                        <span className={`h-2 w-2 rounded-full ${selected.status >= INVOICE_STATUS.OPEN ? 'bg-[#F59E0B]' : 'bg-[#C7CBD9]'}`} />
                        <span className="text-sm font-medium text-[#33405F]">Created</span>
                      </div>
                      <div className={`mt-2 flex items-center gap-3 rounded-[14px] border px-4 py-3 ${selected.status >= INVOICE_STATUS.ACCEPTED ? 'border-[#DBEAFE] bg-[#EFF6FF]' : 'border-[#E1E3F0] bg-white opacity-60'}`}>
                        <span className={`h-2 w-2 rounded-full ${selected.status >= INVOICE_STATUS.ACCEPTED ? 'bg-[#3B82F6]' : 'bg-[#C7CBD9]'}`} />
                        <span className="text-sm font-medium text-[#33405F]">Accepted by payee</span>
                      </div>
                      <div className={`mt-2 flex items-center gap-3 rounded-[14px] border px-4 py-3 ${selected.status >= INVOICE_STATUS.SETTLED ? 'border-[#C6F0DD] bg-[#F0FBF5]' : 'border-[#E1E3F0] bg-white opacity-60'}`}>
                        <span className={`h-2 w-2 rounded-full ${selected.status >= INVOICE_STATUS.SETTLED ? 'bg-[#35B86B]' : 'bg-[#C7CBD9]'}`} />
                        <span className="text-sm font-medium text-[#33405F]">Settled</span>
                      </div>
                      {selected.status === INVOICE_STATUS.CANCELLED && (
                        <div className="mt-2 flex items-center gap-3 rounded-[14px] border border-[#EEF0F5] bg-[#F7F8FC] px-4 py-3">
                          <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
                          <span className="text-sm font-medium text-[#33405F]">Cancelled</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      {selected.status === INVOICE_STATUS.OPEN && (
                        <>
                          <button type="button" onClick={() => updateStatus(selected.id, 'accept')} disabled={!isConnected || actionBusy !== null}
                            className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#29375F] px-6 text-sm font-semibold text-white transition hover:bg-[#1F2C50] disabled:opacity-40">
                            {actionBusy === selected.id ? <Loader2 size={15} className="animate-spin" /> : null}Accept
                          </button>
                          <button type="button" onClick={() => updateStatus(selected.id, 'cancel')} disabled={!isConnected || actionBusy !== null}
                            className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#FDECEC] px-6 text-sm font-semibold text-[#8C2F2F] transition hover:bg-[#F9DADA] disabled:opacity-40">
                            {actionBusy === selected.id ? <Loader2 size={15} className="animate-spin" /> : null}Cancel
                          </button>
                        </>
                      )}
                      {selected.status === INVOICE_STATUS.ACCEPTED && (
                        <button type="button" onClick={() => updateStatus(selected.id, 'settle')} disabled={!isConnected || actionBusy !== null}
                          className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#35B86B] px-6 text-sm font-semibold text-white transition hover:bg-[#2EA35C] disabled:opacity-40">
                          {actionBusy === selected.id ? <Loader2 size={15} className="animate-spin" /> : null}Settle
                        </button>
                      )}
                      {selected.status === INVOICE_STATUS.SETTLED && (
                        <p className="text-sm text-[#69728C]">Settled. Funds change hands off-chain per the memo.</p>
                      )}
                      {selected.status === INVOICE_STATUS.CANCELLED && (
                        <p className="text-sm text-[#69728C]">This invoice was cancelled by its creator on the ledger.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-8 text-xs text-[#9298AB] sm:px-6">
        <span>Built on <a href="https://midnight.network" target="_blank" rel="noopener noreferrer" className="text-[#596581] underline-offset-2 hover:underline">Midnight</a> · Preview</span>
        <span className="font-mono">{NETWORK_ID}</span>
      </footer>
    </div>
  );
}