# Developer Feedback & Experience: Night Desk on Midnight

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
