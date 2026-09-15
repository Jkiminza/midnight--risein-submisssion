# Night Desk — private invoices on Midnight

Night Desk is a private invoice ledger on the [Midnight](https://midnight.network) **Preview** network where amounts and memos stay on-device and only a verifiable status reaches the public chain.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-green)
![Network](https://img.shields.io/badge/network-Preview-8b5cf6)
![Platform](https://img.shields.io/badge/platform-web-lightgrey)

## Description

Night Desk is a private invoicing dapp running on the Midnight network. A creator writes an amount and a memo, a payee accepts, and the creator settles when payment lands — all without the details of any invoice ever being exposed on the ledger. The public side of the contract stores only each invoice's id, its status (open → accepted → settled, or cancelled), and the creator's identity hash, so the whole lifecycle can be verified while the sensitive data stays opaque.

Invoices are a public record by default on nearly every system. The amount, the memo, and the parties are typically visible to whoever can read the ledger or the database — an operator, an indexer, or a hostile observer. That exposure is a real cost for anyone issuing sensitive bills: confidentiality agreements, business pricing, personal debts, or anything where "how much" and "what for" shouldn't be common knowledge. Traditional invoicing forces users to choose between on-chain transparency and trusting a central party with private financial data.

Night Desk solves this with zero-knowledge proofs. The Midnight compact circuit binds the private amount and memo into a proof at creation time, so the requested figure can be committed to without ever being written to the chain. The ledger records only the id, the status, and an identity-derived commitment that lets the circuit enforce rules like "only the creator may cancel" and "amounts and memos must match the signed invoice". Statuses are readable from the public indexer with no wallet required; creating, accepting, settling, and cancelling each require a signed proof from the [Lace](https://lace.io) wallet. The result is an invoice system where the facts anyone can verify — who, when, what status — are public, and the facts nobody should know — how much and what for — never leave the parties' devices.

## Table of Contents

- [Description](#description)
- [Demo / Screenshots](#demo--screenshots)
- [Features](#features)
- [How it works](#how-it-works)
- [Privacy model](#privacy-model)
- [Deployed contract](#deployed-contract)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deploy from scratch](#deploy-from-scratch)
- [Contributing](#contributing)
- [Roadmap / known issues](#roadmap--known-issues)
- [License](#license)
- [Credits / acknowledgments](#credits--acknowledgments)
- [Contact / support](#contact--support)
- [Support matrix](#support-matrix)
- [Notes](#notes)

## Demo / Screenshots

![Screenshots pending] — add your own screenshots of the landing page, the invoice workspace, and a settled ledger row here.

## Features

- **Truly private invoices** — the amount and memo exist only inside a zero-knowledge proof and in the creator's wallet. They never reach the ledger.
- **Public but opaque ledger** — anyone can read the ledger off-chain and see each invoice's id, status, and creator identity hash — nothing else.
- **Full lifecycle** — create → accept → settle, plus cancel; state transitions are enforced in the circuit, not the UI.
- **Creator-only cancellation** — enforced inside the circuit via the creator's identity commitment; nobody else can cancel your invoice.
- **Read without a wallet** — statuses are fetched from the public GraphQL indexer, so browsing the ledger needs no wallet or network fees.
- **Signed actions** — creating, accepting, settling, and cancelling each require a proof signed by the [Lace](https://lace.io) wallet on Preview.
- **Pre-deployed contract** — join the shipped contract instantly, or deploy a fresh one with one click from the UI.
- **Responsive web app** — a React + Next.js frontend with a New Invoice / Public Ledger / Invoice Detail workspace.

## How it works

- A creator writes an amount (their currency) and a memo (≤ 32 chars). A `createInvoice` proof binds them; only the id, status `open`, and the creator's `ownerCommitment(persistentHash("nightdesk:owner:" ‖ sk))` reach the ledger.
- A payee accepts → status flips to `accepted` without the private amount ever moving.
- On payment, the creator marks it `settled`, a public verifiable settlement receipt.
- Only the creator can `cancel` — enforced inside the circuit via their identity hash.

Statuses are read from the public indexer (no wallet needed to browse). Creating/accepting/settling/cancelling requires the [Lace](https://lace.io) wallet connected to Preview.

## Privacy model

Night Desk is built on Midnight's zero-knowledge architecture to guarantee strict confidentiality between transacting parties while maintaining public verifiability on the chain.

### What an Observer (or Ledger Scraper) Can Learn:
- **Invoice ID:** The sequential number assigned to the invoice (e.g., `#1`, `#2`).
- **Invoice Status:** Whether an invoice is `Open (0)`, `Accepted (1)`, `Settled (2)`, or `Cancelled (3)`.
- **Creator Identity Hash:** A cryptographic commitment (`creatorHash`) derived from the creator's local secret key, preventing unauthorized cancellations while hiding their actual wallet address or identity in plain text.
- **Contract Activity Timestamp:** When state transitions occurred on-chain.

### What an Observer Cannot Learn (Guaranteed by ZK Proofs):
- **Invoice Amount:** The exact monetary value or denomination being billed.
- **Memo / Description:** What the invoice is for (e.g., specific project names, terms, or services).
- **Counterparty Details:** Who is paying or receiving the invoice beyond the private ZK proofs exchanged.
- **Financial History:** Aggregate business revenue, client rates, or balance sheets.

## Deployed contract

| | |
|---|---|
| Network | Midnight Preview |
| Contract address | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` |
| Circuit identity | `night-desk` |

The address is also baked into the frontend (`frontend-landing/.env.preview → NEXT_PUBLIC_DEFAULT_CONTRACT`), so the UI can join the deployed contract straight away.

## Installation

### Prerequisites

- **Node 20+** (built and verified on Node 22)
- **Docker** — for the local proof server
- For **using** the dapp: the [Lace](https://lace.io) browser extension, unlocked and pointed at **Preview**
- For **deploying**: a wallet funded with tNIGHT from the [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/)

### Install & run locally

```bash
npm install

# 1. run the proof server (background, port 6300)
npm run proof-server

# 2. start the frontend
npm run dev          # opens http://localhost:3000
```

Open http://localhost:3000, **Connect Wallet** in Lace (set to Preview), and create an invoice. Anyone can join the contract by pasting its address.

### Build and compile

```bash
npm run compile                          # compact compile contract/invoice.compact
npm run build                            # contract + api
cd frontend-landing && npm run build     # production frontend (frontend-landing/.next)
```

## Usage

### Quick start (UI)

1. Make sure the proof server is running and `npm run dev` is up at http://localhost:3000.
2. Click the `/desk` workspace → **New Invoice**.
3. Enter an **Amount** and an optional **Memo** (≤ 32 chars).
4. Connect Lace (set to **Preview**) and hit **Create Invoice** — Lace signs a proof; only the id, status, and creator hash are written to the ledger.
5. Switch to **Public Ledger** to see the (redacted) list, then **Invoice Detail** to inspect or accept/settle/cancel.

### Using the API directly

```ts
import { InvoiceAPI } from 'night-desk-api'; // the `api/` workspace package

// Deploy (or `InvoiceAPI.join(...)` with an existing address)
const api = await InvoiceAPI.deploy(providers, secretKey, logger);

// Create a private invoice: amount + memo bytes, both stay off-chain
const id = await api.createInvoice(1000n, new TextEncoder().encode('Ref #42'));

// Drive the lifecycle
await api.acceptInvoice(Number(id));
await api.settleInvoice(Number(id));
// only the creator may cancel:
await api.cancelInvoice(Number(id));

// Read the public side — id, status, creator hash only
api.state$.subscribe(({ invoiceCount, invoices }) => console.log({ invoiceCount, invoices }));
```

### Common use cases

- **Browse the ledger with no wallet** — subscribe to `api.state$` or use the frontend's Public Ledger tab; no connection or fees required.
- **Issue a confidential bill** — create an invoice with a private memo; the counterparty sees the amount only after accepting, and the chain never does.
- **Creator-only reversal** — a mistakenly issued invoice can be cancelled by the creator without telling the ledger why.
- **Settlement receipts** — on payment, marking `settled` produces a public, verifiable receipt without exposing the sum.

## Configuration

| Variable | Location | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_NETWORK_ID` | `frontend-landing/.env.preview` | `preview` | Network the UI connects Lace to. |
| `NEXT_PUBLIC_DEFAULT_CONTRACT` | `frontend-landing/.env.preview` | the [deployed address](#deployed-contract) | Contract the UI joins by default. |
| `NEXT_PUBLIC_INDEXER_URL` | `frontend-landing/.env.preview` | `https://indexer.preview.midnight.network/api/v4/graphql` | Public indexer used for read-only ledger browsing. |
| wallet seed | `deploy/.env` (gitignored) | — | Generated on first deploy; funds the deployment via the Preview faucet. |

Notes on config files:

- `frontend-landing/.env.preview` is committed and contains only non-secret configuration.
- `frontend-landing/.env.local` and `deploy/.env` are gitignored — the latter holds the deploy wallet seed and must never be committed.
- The proof server port (6300) is configured in the `npm run proof-server` script.

## API reference

The `api/` workspace exports the `InvoiceAPI` class plus its types.

### `InvoiceAPI.deploy(providers, secretKey, logger?)`

Deploys a fresh Night Desk contract (admin operation). Returns a live `InvoiceAPI`.

### `InvoiceAPI.join(providers, contractAddress, secretKey, logger?)`

Joins an existing contract by address (participant operation). Returns a live `InvoiceAPI`.

### Instance members

| Member | Type | Description |
|---|---|---|
| `deployedContractAddress` | `ContractAddress` | On-chain address of the joined/deployed contract. |
| `state$` | `Observable<NightDeskDerivedState>` | Live derived state: `{ invoiceCount, invoices: [{ id, status, creatorHash }] }`. |
| `createInvoice(amount, memoBytes)` | `Promise<bigint>` | Create an invoice. **Amount and memo are private — never written to the ledger.** |
| `acceptInvoice(id)` | `Promise<void>` | Accept an open invoice (the payee). |
| `settleInvoice(id)` | `Promise<void>` | Settle an accepted invoice (on payment). |
| `cancelInvoice(id)` | `Promise<void>` | Cancel an open invoice. On-chain, only the creator can cancel. |

### Types (`api/src/common-types.ts`)

- `InvoiceEntry.status` — `0` open → `1` accepted → `2` settled, or `3` cancelled (see `INVOICE_STATUS`).
- `NightDeskDerivedState` — `{ invoiceCount: number; invoices: InvoiceEntry[] }`.

## Architecture

```
┌──────────────┐   ┌─────────────────┐   ┌─────────────────────┐
│   Browser    │   │  Lace wallet    │   │   Proof server      │
│ (React/Next) │◄──┤  (Midnight SDK) │   │  (Docker, :6300)    │
└──────┬───────┘   └───────┬─────────┘   └──────────┬──────────┘
       │                   │                       │
       │  state$, read     │  signed proofs        │ zk proofs
       ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      InvoiceAPI  (api/)                      │
│   deploy/join · createInvoice · accept · settle · cancel     │
└──────────────┬──────────────────────────────────┬────────────┘
               │                                  │
               ▼                                  ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  Midnight compact contract  │     │  Public GraphQL indexer     │
│   (contract/invoice.compact)│     │  (read-only, no wallet)     │
└─────────────────────────────┘     └─────────────────────────────┘
```

Flow: the UI builds a proof with the wallet + proof server, submits it through `InvoiceAPI`, and the compact contract's `ledger` view pushes only id/status/creator-hash to the chain. The indexer then serves that public state back to any reader.

## Project structure

```
night-desk/
├── contract/                  # Midnight compact contract + compiled circuits
│   ├── invoice.compact        #   contract source (private amount/memo logic)
│   ├── managed/               #   compiled circuits + TS bindings (night-desk-contract)
│   └── test/                  #   vitest contract tests
├── api/                       # InvoiceAPI client library
│   ├── src/
│   │   ├── index.ts           #   InvoiceAPI: deploy/join + lifecycle calls
│   │   ├── common-types.ts    #   shared types + INVOICE_STATUS
│   │   └── utils/             #   indexer/ledger helpers
│   └── dist/                  #   built flat output consumed by the UI
├── frontend-landing/          # React + Next.js web app
│   ├── app/
│   │   ├── layout.tsx         #   root layout
│   │   ├── page.tsx           #   landing/hero page
│   │   └── desk/
│   │       ├── page.tsx       #   invoice workspace route
│   │       ├── globals.css    #   desk styles
│   │       ├── hooks/         #   useInvoices (indexer reads)
│   │       └── contexts/      #   BrowserNightDeskManager
│   ├── components/
│   │   └── InvoiceWorkspace.tsx  # New Invoice / Ledger / Detail tabs
│   └── .env.preview           #   committed public config
├── deploy/                    # headless Preview deployment script
│   └── src/deploy.ts
├── proof-server/              # Docker recipe (port 6300)
├── README.md
└── LICENSE                    # Apache-2.0
```

## Testing

The `contract` workspace runs its suite with [Vitest](https://vitest.dev):

```bash
cd contract
npm test          # vitest run — contract logic tests
```

The `api` workspace validates types:

```bash
cd api
npm run typecheck
```

## Deploy from scratch

```bash
npm run proof-server                     # must be running first
npm run deploy                           # builds, generates a wallet, waits for tNIGHT, deploys, prints address
```

On first run the script creates a wallet seed in `deploy/.env`, prints the unshielded address, and waits for tNIGHT — fund that address from the [faucet](https://midnight-tmnight-preview.nethermind.dev/), and it proceeds to register for DUST and deploy. The deployed address is written into `frontend-landing/.env.preview` automatically, so the UI picks it up on next start.

## Contributing

Contributions are welcome. Please keep PRs small and focused, and reference the issue they address.

- **Branches/PRs** — work on a feature branch off `master` and open a PR against [welson-ai/night-desk](https://github.com/welson-ai/night-desk).
- **Code style** — TypeScript throughout; follow the existing formatting in `contract/`, `api/`, and `frontend-landing/`. No comments unless they explain intent.
- **Commits** — one logical change per commit, prefixed by package: `contract:`, `api:`, `desk:`, `docs:`, `deploy:`.
- **Lint/typecheck** — run `npm run typecheck` in `api/` and `npm test` in `contract/` before opening a PR.
- **Secrets** — never commit `deploy/.env` or other wallet secrets.

## Roadmap / known issues

- **Known issue (Preview)** — first use of a circuit requires the proof server to generate parameters; the first invoice can take noticeably longer.
- **Known issue** — stale browser caches of `ui/` (renamed to `frontend-landing/`) may leave `vercel.json` and deploy references out of date.
- **Roadmap** — supporting multiple currencies/amount units, invoice search & filtering in the ledger, audit log of lifecycle transitions, and 5-job GitHub Actions CI/CD pipeline integration.

## License

Licensed under the [Apache License 2.0](LICENSE).

## Credits / acknowledgments

- [Midnight](https://midnight.network) and the Midnight SDK — compact contracts, wallet SDK, indexer, and proof server.
- [Lace](https://lace.io) — the wallet extension used to sign proofs on Preview.
- The Midnight team and community for Preview infrastructure and the `midnight-proof-server` Docker image.

## Contact / support

- **Issue tracker** — [github.com/welson-ai/night-desk/issues](https://github.com/welson-ai/night-desk/issues)
- **Network support** — Midnight Preview [Documentation](https://docs.midnight.network/) and the [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/)

## Support matrix

compact toolchain `0.31.1` · compact runtime `0.16.0` · compact-js `2.5.1` · wallet-sdk `1.2.0` · midnight-js `4.1.1` · proof server `8.1.0`

## Notes

- `frontend-landing/.env.local` and `deploy/.env` are gitignored (the latter holds the deploy wallet seed — never commit it).
- `frontend-landing/.env.preview` is committed and contains only non-secret configuration.
- The proof server holds circuit parameters; it does its heavy lifting on the first request for each circuit.