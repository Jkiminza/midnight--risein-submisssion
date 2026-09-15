"use client";

import { Copy, FileText, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";


export default function InvoiceWorkspace() {
  return (
    <section className="w-full">
      {/* Main workspace */}
      <div className="rounded-[28px] border border-[#D9DCF0] bg-[#F7F7FD]/90 p-4 shadow-[0_18px_50px_rgba(45,55,100,0.08)] sm:p-5 md:p-6">


        {/* Contract header */}
        <div className="flex flex-col gap-4 border-b border-[#E1E3F0] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">


            {/* Wallet icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF0FA] text-[#29375F]">
              <Wallet size={18} strokeWidth={1.8} />
            </div>


            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A829D]">
                Contract
              </span>


              <span className="font-mono text-sm font-medium text-[#29375F]">
                ca117f7f2c6596...476559b7
              </span>


              <button
                type="button"
                className="text-[#8A91A9] transition hover:text-[#29375F]"
                aria-label="Copy contract address"
              >
                <Copy size={14} />
              </button>


              <button
                type="button"
                className="text-sm font-medium text-[#596581] transition hover:text-[#29375F]"
              >
                Switch
              </button>
            </div>
          </div>


          {/* Connection status */}
          <div className="flex w-fit items-center gap-2 rounded-full bg-[#EEF7F1] px-3.5 py-2 text-xs font-semibold text-[#52675A]">
            <span className="h-2 w-2 rounded-full bg-[#35B86B]" />
            Connected
          </div>
        </div>


        {/* Tabs */}
        <div className="mt-5 flex w-full items-center rounded-full bg-[#E9EBF7] p-1">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF6A00] px-4 py-3 text-sm font-semibold text-[#111827] shadow-[0_6px_18px_rgba(255,106,0,0.20)]"
          >
            <FileText size={16} strokeWidth={1.8} />
            New Invoice
          </button>


          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[#69728C] transition hover:bg-white/50 hover:text-[#29375F]"
          >
            <FileText size={16} strokeWidth={1.8} />
            Public Ledger
          </button>


          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[#69728C] transition hover:bg-white/50 hover:text-[#29375F]"
          >
            <FileText size={16} strokeWidth={1.8} />
            Invoice Detail
          </button>
        </div>


        {/* Invoice form */}
        <div className="mt-5 rounded-[24px] border border-[#E1E3F0] bg-[#FBFBFE] p-5 sm:p-6 md:p-7">


          {/* Form heading */}
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


          {/* Inputs */}
          <div className="grid gap-5 md:grid-cols-2">


            {/* Amount */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#33405F]">
                Amount
              </label>


              <div className="flex h-[56px] overflow-hidden rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] transition focus-within:border-[#FF6A00] focus-within:ring-4 focus-within:ring-[#FF6A00]/10">


                <input
                  type="number"
                  placeholder="e.g. 1000"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-[#29375F] outline-none placeholder:text-[#A1A7BA]"
                />


                <button
                  type="button"
                  className="flex items-center gap-2 border-l border-[#D8DCEF] px-4 text-sm font-semibold text-[#394563]"
                >
                  USD
                  <span className="text-xs text-[#8A91A9]">▾</span>
                </button>
              </div>
            </div>


            {/* Memo */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#33405F]">
                Memo <span className="font-normal text-[#9298AB]">(optional)</span>
              </label>


              <input
                type="text"
                placeholder="Add a note..."
                maxLength={32}
                className="h-[56px] w-full rounded-[14px] border border-[#D8DCEF] bg-[#F8F9FE] px-4 text-sm text-[#29375F] outline-none transition placeholder:text-[#A1A7BA] focus:border-[#FF6A00] focus:ring-4 focus:ring-[#FF6A00]/10"
              />
            </div>
          </div>


          {/* Privacy information */}
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


          {/* CTA */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="inline-flex h-[48px] items-center gap-3 rounded-full bg-[#FF6A00] px-7 text-sm font-semibold text-[#111827] shadow-[0_8px_20px_rgba(255,106,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(255,106,0,0.25)] active:translate-y-0"
            >
              Create Invoice
              <span className="text-base">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}