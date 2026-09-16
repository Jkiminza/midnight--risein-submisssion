# Night Desk — Level 2 Submission & Checklist

## 1. Project Overview & Chosen Idea
- **Project Name:** Night Desk
- **Chosen Idea / Track:** **Private Payroll / Splits & Confidential Invoicing** (built around selective disclosure and zero-knowledge proofs on Midnight).
- **Description:** Night Desk is a privacy-first invoicing and settlement platform on the Midnight Network where transaction amounts and descriptive memos are strictly bound on-device via zero-knowledge proofs, while lifecycle states (`Open`, `Accepted`, `Settled`, `Cancelled`) remain publicly verifiable on-chain without leaking confidential business financials.

---

## 2. Level 2 Learning Objectives & Implementation
1. **Designing a dApp around selective disclosure:** Implemented via Midnight Compact circuits (`invoice.compact`) where public indexers expose only invoice IDs and status codes, allowing auditors to verify payment settlement without scraping entire financial ledgers.
2. **Writing contract and application tests:** Configured Vitest test suites (`contract/src/contract.test.ts`) covering private state generation, witness key provisioning, and compiled contract validation.
3. **Setting up a CI/CD pipeline:** Established a robust 5-job GitHub Actions workflow (`.github/workflows/ci.yml`) performing automated build, type-checking, and test execution on every push.
4. **Scoping a realistic product proposal:** Authored `proposal.md` and `feedback.md` mapping out Mainnet transition milestones, enterprise multi-wallet support, and developer ecosystem growth.

---

## 3. Submission Checklist & Artifacts

| Requirement | Status | Artifact / Link |
| :--- | :---: | :--- |
| **Public GitHub Repository** | ✓ Complete | [github.com/welson-ai/night-desk-risein](https://github.com/welson-ai/night-desk-risein) |
| **Live Demo Link** | ✓ Deployed | [night-desk.vercel.app](https://night-desk.vercel.app) |
| **Deployed Preprod Contract** | ✓ Verifiable | `ca117f7f2c6596d1f38bd6ced85d81eb169ca0e47ccc1005cb351502476559b7` (Midnight Preview) |
| **Test Output (3+ tests passing)** | ✓ Passing | 3 Vitest unit tests (`contract.test.ts`) passing successfully |
| **CI/CD Pipeline (Workflow & Runs)** | ✓ Automated | `.github/workflows/ci.yml` (5 jobs: Lint, Build Contract, Test Contract, Build API, Build Frontend) |
| **Demo Video (1 minute)** | ✓ Recorded | [Watch on YouTube](https://youtu.be/fnVdqJmWzRc?si=cmyPQ_X5dY25YjKx) |
| **README “Privacy Model” Section** | ✓ Documented | Detailed breakdown of what observers can and cannot learn in `README.md` |
| **Product Proposal** | ✓ Submitted | `proposal.md` |
| **Minimum 10 Meaningful Commits** | ✓ Exceeded | **49+ meaningful commits** in git history |
