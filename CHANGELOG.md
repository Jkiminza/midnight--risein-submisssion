# Changelog

All notable changes to Night Desk (reverse chronological). The project began as a scaffolded Midnight Compact template and evolved into a deployed, CI/CD-backed, user-tested privacy invoicing dApp.

## [v0.3.0] — 2026-09 — Level 6: launch users, feedback loop & redeployment

- **`LAUNCH_USERS.md` added** — 39 distinct Midnight **Preprod** unshielded addresses for the Level 6 launch cohort, collected from the earlier Preview user group ahead of the Preprod launch; each is cross-checkable against the Google Sheets onboarding ledger.
- **`FEEDBACK.md` §0.1 added** — 4 Level 6 improvements, each linked to the exact code that implements it (Get Started → `/desk`, contract-address fallback, hardened ZK asset pipeline, reviewer doc base).
- **User feedback loop closed** — launch-user responses recorded in the tracking spreadsheet linked from `USERS.md`, `LAUNCH_USERS.md`, and `FEEDBACK.md`.
- **Redeployment** — Preview contract `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` re-joined on Midnight Preview; dapp redeployed to https://nightdesk-cyan.vercel.app/desk and the redeployment is noted in the README deployment table.
- **`TESTING.md` §2 added** — reproducible compact-compile log listing the 4 compiled circuits (`createInvoice`, `acceptInvoice`, `settleInvoice`, `cancelInvoice`).
- **README/SUBMISSION synchronized** — Level 6 users row now points at `LAUNCH_USERS.md`; reviewer-docs matrix and Level 6 checklist entries added.
- **Level 6 objectives made explicit** in `SUBMISSION.md`, each mapped to its artifact.
- **X launch posts published and linked** — three live permalinks on [@Night_desk1](https://x.com/Night_desk1) recorded in `X-PROFILE.md`, `SUBMISSION.md`, and the README evidence table.
- **Canonical live URL moved to `nightdesk-cyan.vercel.app`** across all docs (was `night-deskv1.vercel.app`); both routes verified reachable. Also fixed a stale `nightdesk.vercel.app/desk` reference in `USER-GUIDE.md` that 404'd.
- **UI: invoice lifecycle progress bar** — the desk workspace now renders a lifecycle track on the invoice detail view (`Issued → Accepted → Settled`, with `cancel` as a terminal off-ramp rather than a fourth sequential step), making the 4 compiled circuits visible in the product: `frontend-landing/components/InvoiceWorkspace.tsx` (`LifecycleTrack`). Semantic `<ol>`, `aria-current` on the active step, and clamping for out-of-range on-chain status values.
- **UI: reduced-motion parity** — added a `prefers-reduced-motion` guard to `frontend-landing/app/desk/globals.css`, which previously had none while the landing stylesheet already did.

## [v0.2.0] — 2026-09 — Level 5: users, docs & release hardening

- **Live app** moved to the hosted Vercel project and linked in docs: https://nightdesk-cyan.vercel.app/desk
- **50+ Preview user onboardings** captured in `USERS.md` from the Google Sheets onboarding form (individuals across multiple tech communities globally).
- **Reviewer documentation pack** added: `USER-GUIDE.md`, `ARCHITECTURE.md`, `TESTING.md`.
- **Preprod/Preview terminology** clarified throughout docs (Preview unshielded addresses, `mn_addr_preview…`).
- Onboarding form link updated to the canonical ledger spreadsheet.

## [v0.1.x] — 2026-09 — CI/CD, tests & deployment fixes

- **CI/CD pipeline** (`.github/workflows/ci.yml`) — 5 jobs: Lint & Type Check, Build Contract, Test Contract, Build API, Build Frontend. Runs on every push/PR to `master`/`main`.
- **Contract unit tests** added (`contract/src/contract.test.ts`) — 3 passing Vitest tests covering private-state creation, witness plumbing, and compiled-contract integrity. `vitest ^1.6.0` added as devDependency.
- **Contract build robustification** — build copies ZK `keys/` and `zkir/` assets to `frontend-landing/public/` with conditional guards so CI and Vercel don't fail when outputs are absent.
- **Vercel pipeline fixes** —
  - Root directory = `frontend-landing`, output directory = `.next`; `vercel.json` removed.
  - Removed `frontend-landing/pnpm-lock.yaml` to standardize on npm.
  - Root build script chains contract → api → next build.
- **Fallback contract address** baked into the frontend (`NEXT_PUBLIC_DEFAULT_CONTRACT`) so the deployed Vercel app joins the pre-deployed Preview contract without env vars.
- **Proof-server/CORS** hostname normalization (`localhost` vs `127.0.0.1`) in `BrowserNightDeskManager.ts`.
- **BigInt hardening** — explicit `BigInt(...)` casts for invoice amounts and IDs.
- **Deployment script** now writes `.env.preview` / `.env.local` for the frontend automatically.

## [v0.1.0] — 2026-09 — Initial build (Levels 2–4 foundation)

- **ZK Compact contract** (`contract/invoice.compact`) — private amount/memo bound into proofs; only `id`, `status`, and `creatorHash` disclosed on-chain. Lifecycle: create → accept → settle → cancel (creator-only).
- **`InvoiceAPI` client library** (`api/`) — `deploy`/`join` + lifecycle calls over Midnight.js providers; derived state via `state$`.
- **Frontend** (`frontend-landing/`) — Next.js/Tailwind app with landing page and `/desk` workspace (New Invoice / Public Ledger / Invoice Detail tabs), Lace wallet integration.
- **Proof server** — Dockerized (`midnightntwrk/proof-server:8.1.0`), port 6300.
- **Deploy script** (`deploy/`) — headless Preview deployment with wallet seed management (gitignored).
- **Docs** — `README.md` (privacy model), `PROPOSAL.md`, `FEEDBACK.md`, `SUBMISSION.md` Level 2–4 checklists.
- **Project assets** — `public/` screenshots, branded landing imagery.

## Planned (from `PROPOSAL.md`)

- Mainnet transition: audits, decentralized prover network, multi-sig deployment.
- Enterprise: hardware wallets, multi-sig approval flows, selective-disclosure compliance exports.
- Product: encrypted counterparty messaging, API gateway/webhooks, escrow/streaming payments, mobile companion app.