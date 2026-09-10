# Night Desk — private invoices on Midnight

A private invoice ledger on the [Midnight](https://midnight.network) **Preview** network.

The **amount and memo of every invoice are private**. They exist only inside a zero-knowledge proof and in the wallet of the creator; the public ledger stores only:

- the invoice **id**
- its **status** (open → accepted → settled, or cancelled)
- the creator's **identity hash** (used to enforce that only the creator may cancel)

Nobody else — not even through the public ledger — can see how much an invoice is for or what it says.

## Deployed contract

| | |
|---|---|
| Network | Midnight Preview |
| Contract address | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` |
| Circuit identity | `night-desk` |

The address is also baked into the frontend (`ui/.env.preview → VITE_DEFAULT_CONTRACT`), so the UI can join the deployed contract straight away.

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
| `ui` | React + Vite frontend (preview mode). |
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
cd ui && npm run build                   # production frontend (ui/dist)
```

## Deploy from scratch

```bash
npm run proof-server                     # must be running first
npm run deploy                           # builds, generates a wallet, waits for tNIGHT, deploys, prints address
```

On first run the script creates a wallet seed in `deploy/.env`, prints the unshielded address, and waits for tNIGHT — fund that address from the [faucet](https://midnight-tmnight-preview.nethermind.dev/), and it proceeds to register for DUST and deploy. The deployed address is written into `ui/.env.preview` automatically, so the UI picks it up on next start.

## Support matrix

compact toolchain `0.31.1` · compact runtime `0.16.0` · compact-js `2.5.1` · wallet-sdk `1.2.0` · midnight-js `4.1.1` · proof server `8.1.0`

## Notes

- `ui/.env` and `deploy/.env` are gitignored (the latter holds the deploy wallet seed — never commit it).
- `ui/.env.preview` is committed and contains only non-secret configuration.
- The proof server holds circuit parameters; it does its heavy lifting on the first request for each circuit.