# Night Desk — Complete Submission & Checklist (Levels 2, 3, 4, & 5)

## 1. Project Overview & Chosen Idea
- **Project Name:** Night Desk
- **Chosen Idea / Track:** **Private Payroll / Splits & Confidential Invoicing** (built around selective disclosure and zero-knowledge proofs on Midnight).
- **Description:** Night Desk is a privacy-first invoicing and settlement platform on the Midnight Network where transaction amounts and descriptive memos are strictly bound on-device via zero-knowledge proofs, while lifecycle states (`Open`, `Accepted`, `Settled`, `Cancelled`) remain publicly verifiable on-chain without leaking confidential business financials.

---

## 2. Learning Objectives & Curriculum Implementation

### **Level 2 & Level 3 Objectives:**
1. **Designing a dApp around selective disclosure:** Implemented via Midnight Compact circuits (`invoice.compact`) where public indexers expose only invoice IDs and status codes, allowing auditors to verify payment settlement without scraping entire financial ledgers.
2. **Writing contract and application tests:** Configured Vitest test suites (`contract/src/contract.test.ts`) covering private state generation, witness key provisioning, and compiled contract validation (**3+ passing unit tests**).
3. **Setting up a CI/CD pipeline:** Established a robust 5-job GitHub Actions workflow (`.github/workflows/ci.yml`) performing automated build, type-checking, and test execution on every push.
4. **Scoping a realistic product proposal:** Authored `PROPOSAL.md` and `FEEDBACK.md` mapping out Mainnet transition milestones, enterprise multi-wallet support, and developer ecosystem growth.

### **Level 4 Objectives:**
1. **Implementing privacy-critical core first:** Developed the Zero-Knowledge Compact smart contract (`invoice.compact`) and cryptographic witness binding before building the frontend interface.
2. **Writing user-facing and technical documentation:** Complete documentation including README, architecture guides, privacy model, setup, and usage instructions.
3. **Running CI/CD on codebase:** Fully automated GitHub Actions CI pipeline running across all 5 build/test jobs on every push.
4. **Building in public & Product X profile:** Established a dedicated project X profile (`@Night_desk1`) linked directly in the repository.

### **Level 5 Objectives:**
1. **User acquisition & small-scale onboarding:** Onboarding real Preprod users and tracking verifiable wallet addresses via `USERS.md` and the [Google Sheets Users Ledger](https://docs.google.com/spreadsheets/d/17fz2AZnhXkLqJwCI4K-1PFxm8261BbpmAplVcndfHs0/edit?usp=sharing).
2. **Structured feedback collection & prioritization:** Documenting developer/user friction points, feedback loops, and iterative improvements (`FEEDBACK.md`).
3. **Documentation synchronization:** Keeping technical docs (`README.md`, `SUBMISSION.md`) in sync with product evolution.
4. **Milestone commit velocity:** Maintaining **50+ meaningful commits** (exceeding the 20 minimum).

---

## 3. Comprehensive Submission Checklist & Artifacts

| Requirement | Status | Artifact / Link |
| :--- | :---: | :--- |
| **Public GitHub Repository** | ✓ Complete | [github.com/welson-ai/night-desk-risein](https://github.com/welson-ai/night-desk-risein) |
| **Live Demo Link** | ✓ Deployed | [night-deskv1.vercel.app/desk](https://night-deskv1.vercel.app/desk) |
| **Deployed Preprod Contract** | ✓ Verifiable | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` (Midnight Preview) |
| **57 Preview / Preprod User Wallets & Form** | ✓ Documented | `USERS.md` (57 Unshielded Preview/Preprod addresses) & [Google Sheets Form](https://docs.google.com/spreadsheets/d/17fz2AZnhXkLqJwCI4K-1PFxm8261BbpmAplVcndfHs0/edit?usp=sharing) |
| **Feedback Loop Documentation** | ✓ Complete | `FEEDBACK.md` (Structured user feedback & developer reflections) |
| **Test Output (3+ tests passing)** | ✓ Passing | 3 Vitest unit tests (`contract.test.ts`) passing successfully |
| **CI/CD Pipeline (Workflow & Runs)** | ✓ Automated | `.github/workflows/ci.yml` (5 jobs: Lint, Build Contract, Test Contract, Build API, Build Frontend) |
| **Product X Profile** | ✓ Linked | [@Night_desk1](https://x.com/Night_desk1) |
| **Demo Video (1 minute)** | ✓ Recorded | [Watch on YouTube](https://youtu.be/fnVdqJmWzRc?si=cmyPQ_X5dY25YjKx) |
| **README “Privacy Model” Section** | ✓ Documented | Detailed breakdown of what observers can and cannot learn in `README.md` |
| **Reviewer Documentation Pack** | ✓ Complete | `USER-GUIDE.md` (live walkthrough), `ARCHITECTURE.md` (technical deep-dive), `TESTING.md` (tests + CI) |
| **Brand & Social Briefs** | ✓ Complete | `BRAND-BRIEF.md` (identity/palette/voice) & `X-PROFILE.md` (product X playbook for `@Night_desk1`) |
| **Product Proposal** | ✓ Submitted | `PROPOSAL.md` |
| **Minimum 20 Meaningful Commits** | ✓ Exceeded | **50+ meaningful commits** in git history |
