# Night Desk — Technical Architecture

This document explains how Night Desk is built: the Zero-Knowledge (ZK) Compact contract, the client-side proof pipeline, the read path through public indexers, and how privacy is preserved at every layer.

- **Network:** Midnight Preview
- **Deployed contract:** `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7`
- **Live app:** https://night-deskv1.vercel.app/desk
- **Source:** [github.com/welson-ai/night-desk-risein](https://github.com/welson-ai/night-desk-risein)

---

## 1. System overview

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

## 2. The private state (what never reaches the chain)

Each circuit invocation is bound to a **private state** produced by `createNightDeskPrivateState` (`contract/src/witnesses.ts`): a 32-byte local secret key.

- The secret key is known only to the wallet that generated it.
- The circuit exposes a witness `localSecretKey()` that lets the ZK predicate derive an `ownerCommitment` — `persistentHash(pad(32,"nightdesk:owner:") ‖ sk)` — without ever revealing the key itself.
- The **amount** and **memo** are plain circuit inputs. They are *constrained* by assertions (`amount != 0`, `memo != default`) but **never `disclose`d**, so they are provable facts that only exist inside the proof.

**Result:** the only data that reaches the ledger is `nextId`, an `id` (`disclose`d), a `status`, and a `creatorHash` — each `disclose(...)` in `invoice.compact` is an explicit privacy decision.

## 3. On-chain state (the public ledger)

Public ledger maps declared in `contract/invoice.compact`:

- `nextId: Counter` — sequence counter for invoice ids.
- `invoices: Map<Uint<64>, InvoicePublic>` where `InvoicePublic { status: Uint<8>, creatorHash: Bytes<32> }`.

State transitions are enforced **inside the circuit**, not the UI:

| Circuit | Precondition | Effect |
|---|---|---|
| `createInvoice(amount, memo)` | `amount != 0`, `memo` present | `id = ++nextId`; insert `{status: 0, creatorHash}` |
| `acceptInvoice(id)` | invoice exists, `status == 0` | `status → 1` |
| `settleInvoice(id)` | invoice exists, `status == 1` | `status → 2` |
| `cancelInvoice(id)` | invoice exists, `status == 0`, caller's `ownerCommitment == creatorHash` | `status → 3` |

`status`: `0 = open`, `1 = accepted`, `2 = settled`, `3 = cancelled` (`INVOICE_STATUS` in `api/src/common-types.ts`).

## 4. Proof pipeline (write path)

1. The UI (`frontend-landing/app/desk/contexts/BrowserNightDeskManager.ts`) assembles a `NightDeskProviders` bundle: `privateStateProvider`, `publicDataProvider`, `zkConfigProvider`, `proofProvider`, `walletProvider` from `@midnight-ntwrk/midnight-js-*`.
2. ZK circuit assets for the configured circuit (`night-desk`) are fetched from `frontend-landing/public/zkir/` and `public/keys/` (copied at build time from `contract/managed/`).
3. Proof generation is delegated to the Dockerized **proof server** on port `6300` (image `midnightntwrk/proof-server:8.1.0`).
4. The generated proof is **signed by Lace**, serialized, and submitted through `InvoiceAPI` (`api/` workspace) as a Midnight transaction.
5. The compact contract validates the proof, applies the state transition, and writes only disclosed values to the ledger.

## 5. Read path (no wallet required)

Browsing the ledger is a pure **read** against the public GraphQL indexer (`https://indexer.preview.midnight.network/api/v4/graphql`, see `frontend-landing/.env.preview`). `useInvoices` (`frontend-landing/app/desk/hooks/`) and `api.state$` expose `{ invoiceCount, invoices: [{ id, status, creatorHash }] }`. No wallet connection and no network fees are required to observe the public lifecycle.

## 6. Why the architecture preserves privacy

1. **Selective disclosure is explicit** — every public field is wrapped in `disclose(...)`; anything not disclosed is provable-but-private.
2. **Authorization is identity-derived, not identity-revealing** — only the *hash* of the creator key is compared inside the circuit (`ownerCommitment(localSecretKey()) == entry.creatorHash`), so cancellation rights are enforced without publishing an address.
3. **The amount/memo never re-enter the system** — they are inputs at proof time and stay with the parties' local state; there is no on-chain slot that could be queried or scraped.
4. **The backend is thin** — `InvoiceAPI` is a transport/helper layer; there is no database of invoice contents anywhere in the stack.

## 7. Monorepo layout

```
contract/          # Midnight Compact source, compiled circuits, TS bindings, Vitest tests
api/               # InvoiceAPI client library + shared types
frontend-landing/  # Next.js app (landing page + /desk workspace)
deploy/            # headless Preview deployment script (deploy/.env holds the seed, gitignored)
proof-server/      # Docker recipe for the ZK proof server (port 6300)
.github/workflows/ # CI/CD (5 jobs)
```

## 8. Related documents

- `README.md` — overview, privacy model, setup, API reference
- `Testing.md` — test strategy and results
- `User-Guide.md` — step-by-step walkthrough for reviewers
- `Proposal.md` — mainnet transition roadmap
- `Feedback.md` — developer experience reflection