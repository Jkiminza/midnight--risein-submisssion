# Developer Feedback & Experience: Night Desk on Midnight

## 0. User Feedback Summary

Several users of Night Desk provided feedback and gave us updates on the product during the Preprod testing phase. They shared their experience using the dapp — what worked, what felt confusing, and what they would like to see improved. All feedback is recorded in the user feedback tracking sheet:

- **Feedback Log (Excel / Google Sheets):** https://docs.google.com/spreadsheets/d/17fz2AZnhXkLqJwCI4K-1PFxm8261BbpmAplVcndfHs0/edit?usp=sharing

The onboarded testers (see `USERS.md` and `LAUNCH_USERS.md`) reached out across our onboarding form and community channels; the spreadsheet captures each individual's notes, so the full user feedback loop is auditable alongside the developer reflections below.

---

## 0.1 Level 6 Improvements (implemented, with code links)

Feedback from launch users directly drove the following shipped improvements. Each change is traceable to a specific diff:

1. **One-click path to the live dapp (Get Started → /desk).** Reviewer and user feedback flagged that the landing page's CTAs only scrolled the page instead of reaching the product. Both the header and hero "Get Started" buttons now link straight into the deployed `/desk` workspace: `frontend-landing/app/page.tsx` (`header-cta` and `hero-actions` anchors → `/desk`).
2. **Bootstrapped contract joining on the deployed app.** The Vercel deployment environment had no `NEXT_PUBLIC_DEFAULT_CONTRACT`, so the hosted app could not join a contract without manual input. We baked the deployed Preview contract address as a fallback in `frontend-landing/app/desk/page.tsx` (`DEFAULT_CONTRACT` fallback), so the live demo at https://night-deskv1.vercel.app/desk connects out of the box.
3. **Hardened ZK asset pipeline for CI/deploys.** Early builds broke CI and Vercel because the frontend referenced circuit assets that only appeared after a manual compile. The contract build now copies `managed/night-desk/keys/*` and `zkir/*` into `frontend-landing/public/` with conditional guards (`contract/package.json`, `build` script), and a 5-job pipeline enforces it: `.github/workflows/ci.yml`.
4. **Documentation base for reviewers.** Built `ARCHITECTURE.md`, `TESTING.md`, `USER-GUIDE.md`, `BRAND-BRIEF.md`, `X-PROFILE.md`, `CHANGELOG.md`, plus a verified compile-log section in `TESTING.md` documenting the 4 compiled circuits (`createInvoice`, `acceptInvoice`, `settleInvoice`, `cancelInvoice`).

---

## 1. Overview
Building **Night Desk** on the Midnight Network provided a deep, hands-on exploration of privacy-first, zero-knowledge smart contract development. Combining Midnight's Compact language, the Midnight.js SDK, the Lace wallet extension, and Next.js allowed us to construct a fully functional decentralized application where invoice lifecycles are publicly verifiable while sensitive financial amounts and memos remain strictly private on-device.

---

## 2. What Worked Exceptionally Well
- **Compact Language Design:** Writing ZK contracts in Compact (`invoice.compact`) was remarkably intuitive. Pragma language versioning, built-in standard library helpers (`persistentHash`, `disclose`), and clear state map primitives (`Map<Uint<64>, InvoicePublic>`) made enforcing complex ZK predicates (such as creator-only cancellation and state transition assertions) clean and secure.
- **Midnight.js SDK Modularity:** The separation of concerns across providers (`privateStateProvider`, `publicDataProvider`, `zkConfigProvider`, `proofProvider`, `walletProvider`) enabled a clean architecture that seamlessly bridged browser-based Lace interactions and Node.js CLI deployment scripts.
- **Public Indexer Architecture:** Offloading read queries to public GraphQL indexers was a standout feature. Users can browse the entire public invoice ledger instantly without needing an active wallet connection or paying gas fees.

---

## 3. Developer Experience Challenges & Friction
- **Local Proof Server Management:** Requiring a separate Docker container (`midnightntwrk/proof-server:8.1.0`) running on port `6300` adds setup friction for new contributors. Ensuring version compatibility between the ZK circuit assets (`zkir`, `prover`, `verifier`) and the proof server image is critical.
- **CORS & Hostname Nuances:** Local development required careful alignment between browser hostnames (`localhost` vs `127.0.0.1`) and Lace wallet configuration URIs to prevent browser CORS blocks on `fetch` requests to the local proof server.
- **Strict BigInt Conversion:** Compact circuit arguments expecting `Uint<64>` strict types require explicit `BigInt(...)` casting in TypeScript frontend handlers, which can catch developers off guard if passing raw form inputs or string values.

---

## 4. Suggestions for Future Improvements
- **Lightweight / WASM Provers:** Exploring browser-native or lightweight WASM-based ZK proof generation as an alternative to a mandatory Dockerized proof server would significantly simplify onboarding and local testing.
- **Enhanced CLI Scaffolding:** Providing an official CLI tool (`npx @midnight/create-dapp`) with pre-configured Next.js monorepo templates, workspace linking, and automated asset copying would accelerate dApp prototyping.
- **Expanded Documentation & Examples:** Adding more reference implementations for private state synchronization and multi-party cryptographic workflows would greatly aid developers building complex enterprise DeFi or invoicing solutions on Midnight.
