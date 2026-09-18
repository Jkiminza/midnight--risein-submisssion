# Changelog

All notable changes to Night Desk (reverse chronological). The project began as a scaffolded Midnight Compact template and evolved into a deployed, CI/CD-backed, user-tested privacy invoicing dApp.

## [v0.2.0] — 2026-09 — Level 5: users, docs & release hardening

- **Live app** moved to the hosted Vercel project and linked in docs: https://night-deskv1.vercel.app/desk
- **50+ Preview user onboardings** captured in `users.md` from the Google Sheets onboarding form (individuals across multiple tech communities globally).
- **Reviewer documentation pack** added: `user-guide.md`, `architecture.md`, `testing.md`.
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
- **Docs** — `README.md` (privacy model), `proposal.md`, `feedback.md`, `submission.md` Level 2–4 checklists.
- **Project assets** — `public/` screenshots, branded landing imagery.

## Planned (from `proposal.md`)

- Mainnet transition: audits, decentralized prover network, multi-sig deployment.
- Enterprise: hardware wallets, multi-sig approval flows, selective-disclosure compliance exports.
- Product: encrypted counterparty messaging, API gateway/webhooks, escrow/streaming payments, mobile companion app.