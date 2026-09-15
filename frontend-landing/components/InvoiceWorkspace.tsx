"use client";

import { useState } from "react";
import {
  Copy,
  FileText,
  List,
  LockKeyhole,
  Loader2,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type View = "invoice" | "ledger" | "detail";

interface InvoiceItem {
  id: number;
  status: number;
}

interface LocalInvoice {
  amount: string;
  memo: string;
  createdAt: string;
}

interface InvoiceWorkspaceProps {
  contractAddress: string;
  copied: boolean;
  onCopy: () => void;
  showJoinPanel: boolean;
  onToggleJoin: () => void;
  joinInput: string;
  onJoinInput: (v: string) => void;
  onJoin: () => void;
  onDeploy: () => void;
  deploying: boolean;
  isConnected: boolean;
  walletState: string;
  onConnect: () => void;
  amount: string;
  onAmount: (v: string) => void;
  memo: string;
  onMemo: (v: string) => void;
  onCreate: () => void;
  creating: boolean;
  createStatus: string | null;
  invoices: InvoiceItem[];
  invoiceCount: number;
  loading: boolean;
  ledgerError: string | null;
  onSelect: (id: number) => void;
  selected: InvoiceItem | undefined;
  selectedLocal: LocalInvoice | undefined;
  onUpdateStatus: (id: number, action: "accept" | "settle" | "cancel") => void;
  actionBusy: number | null;
  statusMeta: Record<number, { label: string }>;
  decodeMemo: (b: Uint8Array | string) => string;
}

function truncAddr(addr: string): string {
  return addr.length <= 24 ? addr : `${addr.slice(0, 14)}…${addr.slice(-8)}`;
}

export default function InvoiceWorkspace({
  contractAddress,
  copied,
  onCopy,
  showJoinPanel,
  onToggleJoin,
  joinInput,
  onJoinInput,
  onJoin,
  onDeploy,
  deploying,
  isConnected,
  walletState,
  onConnect,
  amount,
  onAmount,
  memo,
  onMemo,
  onCreate,
  creating,
  createStatus,
  invoices,
  invoiceCount,
  loading,
  ledgerError,
  onSelect,
  selected,
  selectedLocal,
  onUpdateStatus,
  actionBusy,
  statusMeta,
  decodeMemo,
}: InvoiceWorkspaceProps) {
  const [view, setView] = useState<View>("invoice");

  const statusLabel = (s: number) => statusMeta[s]?.label ?? "Open";
  const addr = contractAddress ? truncAddr(contractAddress) : "not deployed";

  const tab = (id: View, label: string, IconComp: typeof FileText) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
        view === id
          ? "bg-[#FF6A00] font-semibold text-[#111827] shadow-[0_6px_18px_rgba(255,106,0,0.20)]"
          : "text-[#69728C] hover:bg-white/50 hover:text-[#29375F]"
      }`}
    >
      <IconComp size={16} strokeWidth={1.8} />
      {label}
    </button>
  );

  return (
    <section className="w-full">
      <div className="rounded-[28px] border border-[#D9DCF0] bg-[#F7F7FD]/90 p-4 shadow-[0_18px_50px_rgba(45,55,100,0.08)] sm:p-5 md:p-6">
        {/* Contract header */}
        <div className="flex flex-col gap-4 border-b border-[#E1E3F0] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF0FA] text-[#29375F]">
              <Wallet size={18} strokeWidth={1.8} />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A829D]">
                Contract
              </span>

              <button
                type="button"
                onClick={onCopy}
                className="flex items-center gap-2"
                aria-label="Copy contract address"
              >
                <span className="font-mono text-sm font-medium text-[#29375F]">
                  {addr}
                </span>
                {copied ? (
                  <span className="text-[#35B86B]">
                    <Check size={14} />
                  </span>
                ) : (
                  <span className="text-[#8A91A9] transition hover:text-[#29375F]">
                    <Copy size={14} />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleJoin}
                className="text-sm font-medium text-[#596581] transition hover:text-[#29375F]"
              >
                {showJoinPanel ? "Cancel" : "Switch"}
              </button>
            </div>
          </div>

          {/* Connection status */}
          <div
            className={`flex w-fit items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${
              contractAddress
                ? "bg-[#EEF7F1] text-[#52675A]"
                : "bg-[#EEF0F5] text-[#6B7280]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                contractAddress ? "bg-[#35B86B]" : "bg-[#9CA3AF]"
              }`}
            />
            {contractAddress ? "Connected" : "No contract"}
          </div>
        </div>

        {/* Join / deploy panel */}
        {showJoinPanel && (
          <div className="mt-5 rounded-[20px] border border-[#E1E3F0] bg-white p-4">
            <label className="mb-2 block text-sm font-medium text-[#33405F]">
              Contract address (64 hex chars)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="ca117f7f…476559b7"
                value={joinInput}
                onChange={(e) => onJoinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onJoin()}
                className="h-[48px] min-w-0 flex-1 rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] px-4 font-mono text-sm text-[#29375F] outline-none transition placeholder:text-[#A1A7BA] focus:border-[#FF6A00] focus:ring-4 focus:ring-[#FF6A00]/10"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={!joinInput.trim()}
                  className="inline-flex h-[48px] items-center justify-center rounded-full bg-[#29375F] px-6 text-sm font-semibold text-white transition hover:bg-[#1F2C50] disabled:opacity-40"
                >
                  Join Contract
                </button>
                {isConnected ? (
                  <button
                    type="button"
                    onClick={onDeploy}
                    disabled={deploying}
                    className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full border border-[#FF6A00] bg-[#FFF0E7] px-6 text-sm font-semibold text-[#B84A00] transition hover:bg-[#FFE4D1] disabled:opacity-40"
                  >
                    {deploying ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : null}
                    {deploying ? "Deploying…" : "Deploy New"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConnect}
                    disabled={walletState !== "ready"}
                    className="inline-flex h-[48px] items-center justify-center rounded-full border border-[#D9DCF0] px-6 text-sm font-semibold text-[#394563] transition hover:bg-[#EEF0FA] disabled:opacity-40"
                  >
                    Connect to Deploy
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-5 flex w-full items-center rounded-full bg-[#E9EBF7] p-1">
          {tab("invoice", "New Invoice", FileText)}
          {tab("ledger", "Public Ledger", List)}
          {tab("detail", "Invoice Detail", Receipt)}
        </div>

        {/* ── New Invoice ──────────────────────────────────────────────── */}
        {view === "invoice" && (
          <div className="mt-5 rounded-[24px] border border-[#E1E3F0] bg-[#FBFBFE] p-5 sm:p-6 md:p-7 space-y-5">
            <div className="mb-7 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0E7] text-[#FF6A00]">
                <LockKeyhole size={19} strokeWidth={1.8} />
              </div>

              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">
                  Create private invoice
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#69728C]">
                  Amount and memo are private — they are bound into the proof
                  and never written to the ledger.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#33405F]">
                  Amount
                </label>
<div className="flex h-[56px] rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] transition focus-within:border-[#FF6A00] focus-within:ring-4 focus-within:ring-[#FF6A00]/10">
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={amount}
                  onChange={(e) => onAmount(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-[#29375F] outline-none placeholder:text-[#A1A7BA]"
                />
              </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#33405F]">
                  Memo{" "}
                  <span className="font-normal text-[#9298AB]">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Add a note.."
                  maxLength={32}
                  value={memo}
                  onChange={(e) => onMemo(e.target.value)}
                  className="h-[56px] w-full rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] px-4 text-sm text-[#29375F] outline-none transition placeholder:text-[#A1A7BA] focus:border-[#FF6A00] focus:ring-4 focus:ring-[#FF6A00]/10"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-[14px] bg-[#F0F1FA] px-4 py-3.5">
              <ShieldCheck
                size={18}
                strokeWidth={1.8}
                className="shrink-0 text-[#64708F]"
              />
              <p className="text-xs leading-5 text-[#69728C]">
                This information is encrypted and never leaves your device.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              {isConnected ? (
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={creating || !amount.trim() || !memo.trim()}
                  className="inline-flex h-[48px] items-center gap-3 rounded-full bg-[#FF6A00] px-7 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(255,106,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,106,0,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {creating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {creating ? createStatus : "Create Invoice"}
                  {!creating && <span className="text-base">→</span>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={walletState !== "ready"}
                  className="inline-flex h-[48px] items-center gap-3 rounded-full bg-[#FF6A00] px-7 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(255,106,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,106,0,0.25)] active:translate-y-0"
                >
                  {walletState === "no-wallet"
                    ? "Install Lace to Create"
                    : "Connect Wallet to Create"}
                  <span className="text-base">→</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Public Ledger ────────────────────────────────────────────── */}
        {view === "ledger" && (
          <div className="mt-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">
                Public Ledger
              </h2>
              <span className="font-mono text-sm text-[#9298AB]">
                {invoiceCount} issued{" "}
                {invoiceCount === 1 ? "invoice" : "invoices"}
              </span>
            </div>

            {ledgerError ? (
              <div className="py-6 text-center text-sm text-[#8C2F2F]">
                Ledger error: {ledgerError}
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#69728C]">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" /> Reading
                    ledger…
                  </span>
                ) : (
                  "No invoices on this contract yet. The ledger is empty."
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E1E3F0]">
                <div className="flex items-center gap-3 pb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#9298AB]">
                  <span className="w-12">ID</span>
                  <span className="w-24">Status</span>
                  <span className="w-24">Amount</span>
                  <span className="min-w-0 flex-1">Memo</span>
                </div>
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      onSelect(inv.id);
                      setView("detail");
                    }}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:text-[#1F2C50]"
                  >
                    <span className="w-12 font-mono text-sm text-[#29375F]">
                      #{inv.id}
                    </span>
                    <span className="w-24">
                      <span className="inline-flex rounded-full bg-[#FFF4E5] px-2.5 py-1 text-xs font-semibold text-[#B45309]">
                        {statusLabel(inv.status)}
                      </span>
                    </span>
                    <span className="w-24 font-mono text-sm text-[#29375F]">
                      ••••
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-[#69728C]">
                      — private —
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Invoice Detail ───────────────────────────────────────────── */}
        {view === "detail" && (
          <div className="mt-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2C50]">
                Invoice Detail
              </h2>
              {selected && (
                <span className="font-mono text-sm text-[#9298AB]">
                  known by your wallet:{" "}
                  {selectedLocal ? "yes" : "no"}
                </span>
              )}
            </div>

            {!selected ? (
              <div className="py-10 text-center text-sm text-[#69728C]">
                Select an invoice from the ledger to inspect it. Amounts you
                created stay in your wallet — everyone else sees redacted
                entries.
              </div>
            ) : (
              <div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-medium tracking-[0.08em] text-[#9298AB]">
                      Invoice
                    </span>
                    <span className="mt-1 block font-mono text-sm font-medium text-[#1F2C50]">
                      #{selected.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium tracking-[0.08em] text-[#9298AB]">
                      Status
                    </span>
                    <span className="mt-1 block">
                      <span className="inline-flex rounded-full bg-[#FFF4E5] px-2.5 py-1 text-xs font-semibold text-[#B45309]">
                        {statusLabel(selected.status)}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium tracking-[0.08em] text-[#9298AB]">
                      Amount
                    </span>
                    <span className="mt-1 block font-mono text-sm font-medium text-[#1F2C50]">
                      {selectedLocal
                        ? selectedLocal.amount
                        : "•••••• (private)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium tracking-[0.08em] text-[#9298AB]">
                      Memo
                    </span>
                    <span className="mt-1 block text-sm text-[#1F2C50]">
                      {selectedLocal
                        ? decodeMemo(selectedLocal.memo)
                        : "Private memo — visible only to the parties. Share it off-chain."}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {selected.status === 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(selected.id, "accept")}
                        disabled={!isConnected || actionBusy !== null}
                        className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#29375F] px-6 text-sm font-semibold text-white transition hover:bg-[#1F2C50] disabled:opacity-40"
                      >
                        {actionBusy === selected.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : null}
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(selected.id, "cancel")}
                        disabled={!isConnected || actionBusy !== null}
                        className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#FDECEC] px-6 text-sm font-semibold text-[#8C2F2F] transition hover:bg-[#F9DADA] disabled:opacity-40"
                      >
                        {actionBusy === selected.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : null}
                        Cancel
                      </button>
                    </>
                  )}
                  {selected.status === 1 && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selected.id, "settle")}
                      disabled={!isConnected || actionBusy !== null}
                      className="inline-flex h-[42px] items-center gap-2 rounded-full bg-[#35B86B] px-6 text-sm font-semibold text-white transition hover:bg-[#2EA35C] disabled:opacity-40"
                    >
                      {actionBusy === selected.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : null}
                      Settle
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Check({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
