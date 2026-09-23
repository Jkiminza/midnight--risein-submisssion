# Night Desk — Reviewer Walkthrough

A guided tour of Night Desk for judges, reviewers, and evaluators. The goal: issue a private invoice, watch it appear on the public ledger as an opaque record, and understand that no amount or memo was ever exposed.

## What you need

- A desktop browser with the [Lace wallet](https://lace.io) extension installed, unlocked, and set to the **Preview** network.
- 3–5 minutes.

No local setup is required — everything runs on the hosted app.

## Step 1 — Open the live app

Go to **https://night-deskv1.vercel.app/desk** (the `/desk` workspace of [nightdesk.vercel.app](https://nightdesk.vercel.app)).

The workspace shows three tabs: **New Invoice**, **Public Ledger**, and **Invoice Detail**. The UI joins the deployed contract by default:

| | |
|---|---|
| Network | Midnight Preview |
| Contract | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` |

## Step 2 — Browse the public ledger first (no wallet)

Open the **Public Ledger** tab. You can read every invoice's `id`, `status` (`open`/`accepted`/`settled`/`cancelled`), and creator identity hash — **without connecting a wallet at all**. This is the read path: public GraphQL indexer, zero fees, zero wallet.

Notice what is *not* there: no amounts, no memos, no counterparty addresses.

## Step 3 — Connect Lace and create an invoice

1. Click **Connect Wallet** and approve the connection in Lace (ensure Lace is on **Preview**).
2. Go to **New Invoice**, enter an **Amount** (e.g., `12.50`) and a short **Memo** (≤ 32 chars, e.g., `Confidential audit`).
3. Hit **Create Invoice**. Lace asks you to sign — the wallet is authorizing a **zero-knowledge proof**, not a plaintext transaction.
4. On success, a confirmation bar with the invoice's **Copy ID** button appears.

## Step 4 — Verify the privacy guarantee

1. Copy the new invoice ID.
2. Open **Public Ledger** (or **Invoice Detail** → paste the ID).
3. You'll see the invoice's `id`, `status = open`, and a `creatorHash` — **the amount (`12.50`) and memo (`Confidential audit`) you just typed are nowhere on the ledger**.

The circuit disclosed exactly three things: the sequential id, the status, and a keyed hash. Everything else is bound into the proof and lives only on your device.

## Step 5 — Drive the lifecycle

- **Accept** the invoice — status moves `open → accepted`. The private amount still never appears.
- **Settle** it to produce a public verifiable settlement receipt — again without exposing the sum.
- **Cancel** an open invoice you created — the circuit only permits the creator to cancel (enforced via the identity hash, not the UI).

## Reproduce from source (optional)

For a deeper review, the full local pipeline is documented in `README.md`:

```bash
npm install
npm run proof-server   # Docker ZK proof server on :6300
npm run dev            # http://localhost:3000
```

- Contract source: `contract/invoice.compact` (note every `disclose(...)` — each one is a deliberate privacy decision).
- Contract tests: `cd contract && npm test` → 3 passing.
- CI/CD: `.github/workflows/ci.yml` → 5 jobs.

## Evidence links

- Demo video (1 min): https://youtu.be/fnVdqJmWzRc?si=cmyPQ_X5dY25YjKx
- Product X profile: [@Night_desk1](https://x.com/Night_desk1)
- Onboarding ledger: [Google Sheets form](https://docs.google.com/spreadsheets/d/17fz2AZnhXkLqJwCI4K-1PFxm8261BbpmAplVcndfHs0/edit?usp=sharing)
- Screenshots: [Lace integration](public/lacewallet.png) · [Unit tests](public/tests.png) · [CI pipeline](public/ci-cd.png)