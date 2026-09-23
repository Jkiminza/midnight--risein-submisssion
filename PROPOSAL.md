# Night Desk: Project Evolution & Mainnet Transition Proposal

## 1. Executive Summary

Night Desk is a privacy-first invoicing and settlement application built on the Midnight Network using Zero-Knowledge (ZK) smart contracts in Compact. It allows users and organizations to issue invoices, verify payments, and settle transactions without leaking confidential business data (amounts, memos, and counterparty metadata) onto public ledger explorers.

Following the successful deployment and stabilization of the prototype on the Midnight Preview network, this proposal outlines the comprehensive roadmap for scaling Night Desk, hardening security, transitioning to Mainnet production, and expanding feature sets for enterprise and developer ecosystems.

---

## 2. Current Technical Architecture

- **Smart Contract Layer (`contract/`)**: Written in Midnight Compact (`invoice.compact`), compiling to ZK circuits (`.zkir`, `.bzkir`) and TypeScript bindings. Manages invoice creation, acceptance, settlement, and cancellation with zero-knowledge predicates.
- **API & Middleware (`api/`)**: TypeScript backend utilities for ledger interaction, type sharing (`common-types.ts`), and helper services.
- **Frontend Application (`frontend-landing/`)**: Next.js 16 (App Router) with Tailwind CSS and Base UI / Shadcn. Integrates with the Midnight Lace wallet extension via `@midnight-ntwrk/midnight-js-*` SDK packages and client-side ZK proof generation.
- **Proof & Infrastructure (`proof-server/`)**: Dockerized Midnight proving server running locally or hosted for ZK proof generation on port `6300`.

---

## 3. Roadmap to Mainnet Transition

Transitioning Night Desk from Midnight Preview to Mainnet requires a rigorous, multi-stage protocol hardening and deployment strategy.

### Phase 1: Security Hardening & Formal Auditing (Months 1–2)
- **Compact Contract Audit**: Engage external smart contract audit firms specializing in ZK circuits and Midnight Compact language to review zero-knowledge invariants, state transitions, and witness functions.
- **Fuzzy Testing & Invariant Verification**: Implement property-based testing and fuzzing on all invoice lifecycle methods (`createInvoice`, `acceptInvoice`, `settleInvoice`, `cancelInvoice`).
- **Dependencies & Supply Chain Review**: Run automated CSO (Chief Security Officer) audits across all npm dependencies, lockfiles, and container images.

### Phase 2: Mainnet Infrastructure & Prover Scaling (Months 3–4)
- **Decentralized Prover Network**: Transition from a single local Docker proof server (`proof-server/`) to a distributed, highly available prover pool or hosted proving infrastructure to ensure sub-second proof generation for end-users.
- **Mainnet SDK & Network ID Migration**: Update `@midnight-ntwrk/*` dependencies from `preview` network identifiers to `mainnet` configuration profiles.
- **Genesis Deployment & Governance**: Execute multi-sig genesis deployment of the compiled Compact contract to Midnight Mainnet. Establish protocol upgrade pathways and parameter governance.

### Phase 3: Enterprise & Multi-Wallet Support (Months 5–6)
- **Hardware Wallet Integration**: Integrate Ledger and Trezor support via Lace and Midnight SDK extensions for institutional key management.
- **Multi-Sig & Threshold Signers**: Support multi-signature approval workflows for enterprise treasuries settling high-value invoices.
- **Compliance & Selective Disclosure v2**: Enhance selective proof generation, allowing cryptographic audit packets (e.g., tax compliance reports) to be exported without revealing aggregate balance sheets.

---

## 4. Feature Expansion & Product Roadmap

- **Encrypted Counterparty Messaging**: Implement end-to-end encrypted metadata exchange for invoice attachments, purchase orders, and payment terms using Midnight private state storage.
- **Webhook & API Gateway**: Provide a hosted API gateway for merchants and SaaS platforms to programmatically trigger invoice generation and listen for ZK settlement proofs.
- **Automated Escrow & Streaming Payments**: Extend the Compact contract to support conditional escrow release upon oracle verification or multi-party milestone sign-off.
- **Mobile Companion App**: Develop a React Native / mobile wallet companion for quick invoice verification and push notifications on payment settlement.

---

## 5. Ecosystem Growth & Community Adoption

- **Developer SDK & Template**: Package `night-desk-contract` and UI components into an open-source npm template (`create-night-desk-app`) so other developers can spin up private invoicing dApps instantly.
- **Grants & Hackathons**: Submit proposals to the Midnight Ecosystem Fund and Superteam bounties to bootstrap liquidity and adoption among remote engineering teams.
- **Documentation & Guides**: Publish comprehensive end-user walkthroughs and developer tutorials on integrating zero-knowledge invoices into existing accounting workflows.
