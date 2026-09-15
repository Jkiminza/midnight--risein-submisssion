# Night Desk — private invoices on Midnight

Night Desk is a private invoice ledger on the [Midnight](https://midnight.network) **Preview** network where amounts and memos stay on-device and only a verifiable status reaches the public chain.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-green)
![Network](https://img.shields.io/badge/network-Preview-8b5cf6)
![Platform](https://img.shields.io/badge/platform-web-lightgrey)

## Description

Night Desk is a private invoicing dapp running on the Midnight network. A creator writes an amount and a memo, a payee accepts, and the creator settles when payment lands — all without the details of any invoice ever being exposed on the ledger. The public side of the contract stores only each invoice's id, its status (open → accepted → settled, or cancelled), and the creator's identity hash, so the whole lifecycle can be verified while the sensitive data stays opaque.

Invoices are a public record by default on nearly every system. The amount, the memo, and the parties are typically visible to whoever can read the ledger or the database — an operator, an indexer, or a hostile observer. That exposure is a real cost for anyone issuing sensitive bills: confidentiality agreements, business pricing, personal debts, or anything where "how much" and "what for" shouldn't be common knowledge. Traditional invoicing forces users to choose between on-chain transparency and trusting a central party with private financial data.

Night Desk solves this with zero-knowledge proofs. The Midnight compact circuit binds the private amount and memo into a proof at creation time, so the requested figure can be committed to without ever being committed to the chain. The ledger records only the id, the status, and an identity-derived commitment that lets the circuit enforce rules like "only the creator may cancel" and "amounts and memos must match the signed invoice". Statuses are readable from the public indexer with no wallet required; creating, accepting, settling, and cancelling each require a signed proof from the [Lace](https://lace.io) wallet. The result is an invoice system where the facts anyone can verify — who, when, what status — are public, and the facts nobody should know — how much and what for — never leave the parties' devices.

## Table of Contents

- [Description](#description)
- [Deployed contract](#deployed-contract)
- [How it works](#how-it-works)
- [Monorepo layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Try it](#try-it)
- [Build and compile](#build-and-compile)
- [Deploy from scratch](#deploy-from-scratch)
- [Support matrix](#support-matrix)
- [Notes](#notes)

## Deployed contract

| | |
|---|---|
| Network | Midnight Preview |
| Contract address | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` |
| Circuit identity | `night-desk` |

The address is also baked into the frontend (`frontend-landing/.env.preview → NEXT_PUBLIC_DEFAULT_CONTRACT`), so the UI can join the deployed contract straight away.

## How it works

- A creator writes an amount (their currency) and a memo (≤ 32 chars). A `createInvoice` proof binds them; only the id, status `open`, and the creator's `ownerCommitment(persistentHash("nightdesk:owner:" ‖ sk))` reach the ledger.
- A payee accepts → status flips to `accepted` without the private amount ever moving.
- On payment, the creator marks it `settled`, a public verifiable settlement receipt.
- Only the creator can `cancel` — enforced inside the circuit via their identity hash.

Statuses are read from the public indexer (no wallet needed to browse). Creating/accepting/settling/cancelling requires the [Lace](https://lace.io) wallet connected to Preview.

## Monorepo layout

| package | purpose |
|---|---|
| `contract` | Compact contract `invoice.compact` + compiled circuits (`managed/night-desk`) + TS bindings. |
| `api` | `InvoiceAPI` — deploy/join + createInvoice/acceptInvoice/settleInvoice/cancelInvoice over the ledger. |
| `frontend-landing` | React + Next.js frontend (preview mode). |
| `deploy` | Headless deployment script for Midnight Preview. |
| `proof-server` | Docker recipe for the local proof server (port 6300). |

## Prerequisites

- Node 20+ (built and verified on Node 22)
- Docker (proof server)
- For **using** the dapp: the [Lace](https://lace.io) browser extension, unlocked and pointed at **Preview**
- For **deploying**: a wallet funded with tNIGHT from the [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/)

## Try it

```bash
npm install

# 1. run the proof server (background)
npm run proof-server

# 2. start the frontend
npm run dev          # opens http://localhost:3000
```

Open http://localhost:3000, **Connect Wallet** in Lace (set to Preview), and create an invoice. Anyone can join the contract by pasting its address.

## Build and compile

```bash
npm run compile                          # compact compile contract/invoice.compact
npm run build                            # contract + api
cd frontend-landing && npm run build     # production frontend (frontend-landing/.next)
```

## Deploy from scratch

```bash
npm run proof-server                     # must be running first
npm run deploy                           # builds, generates a wallet, waits for tNIGHT, deploys, prints address
```

On first run the script creates a wallet seed in `deploy/.env`, prints the unshielded address, and waits for tNIGHT — fund that address from the [faucet](https://midnight-tmnight-preview.nethermind.dev/), and it proceeds to register for DUST and deploy. The deployed address is written into `frontend-landing/.env.preview` automatically, so the UI picks it up on next start.

## Support matrix

compact toolchain `0.31.1` · compact runtime `0.16.0` · compact-js `2.5.1` · wallet-sdk `1.2.0` · midnight-js `4.1.1` · proof server `8.1.0`

## Notes

- `frontend-landing/.env.local` and `deploy/.env` are gitignored (the latter holds the deploy wallet seed — never commit it).
- `frontend-landing/.env.preview` is committed and contains only non-secret configuration.
- The proof server holds circuit parameters; it does its heavy lifting on the first request for each circuit.