# Night Desk — Brand Brief

Brand identity reference for anyone building or writing for Night Desk. Use this as the source of truth for palette, type, voice, and messaging, alongside `frontend-landing/app/globals.css` for exact values.

## 1. Brand essence

| Element | Definition |
|---|---|
| Brand name | Night Desk |
| Category | Privacy-first invoicing & settlement on the Midnight Network |
| Tagline | *Invoices that stay private.* |
| Sub-closing tagline | *Private invoice. Public settlement tape.* |
| Promise | Your amounts and memos never leave your device — only a verifiable status reaches the ledger. |
| Archetype | The calm, discreet expert. Quiet confidence, zero gimmicks. |

## 2. Mission

Make confidential billing verifiable without sacrificing privacy. Anyone can confirm an invoice settled; nobody learns how much or what for.

## 3. Target audience

- Independent studios and freelancers billing sensitive clients.
- Protocol/DAO treasuries paying contractors under NDA.
- Finance operators who need proof of settlement without exposing books.
- Auditors who want per-payment proofs, not full-export CSVs.

## 4. Brand values

1. **Private by default** — disclosure is the exception, not the default.
2. **Verifiable over visible** — public proof, private detail.
3. **User-owned** — the wallet holds the keys; Night Desk never custodies funds.
4. **Calm & trustworthy** — no hype, no fake metrics, no dark patterns.

## 5. Voice & tone

- Calm, deliberate, precise.
- Plain language: "the amount stays on your device", not "off-chain custody primitives".
- Factual and proof-driven: cite what the ledger stores (`id`, `status`, `creatorHash`) and what it doesn't (amount, memo, counterparty).
- Never overclaim. Never fabricate numbers on the landing page (the metrics section was removed; restore only with real data).

## 6. Visual identity

### Color palette

| Token | Hex | Usage |
|---|---|---|
| Ink (primary text) | `#14203b` | Headings, body on light |
| Navy (deep) | `#18213a` / `#26345f` | Surfaces, buttons (`#29375F` in desk UI) |
| Accent orange | `#f47c20` / `#d99544` (copper-gold) | CTAs, highlights, crescent mark |
| Desk accent orange | `#FF6A00` | Primary action, focus rings |
| Teal | `#0ea7a3` | Secondary accents, links |
| Muted blues | `#4d5d7b` / `#7e8495` / `#9faac4` | Secondary text, placeholders |
| Success green | `#35B86B` | Settled state, positive feedback |
| Error red | `#8C2F2F` | Errors, cancel actions |
| Backgrounds | `#9faac4` (hero base), `#cbd2e7` (cream), `#F7F7FD` (desk) | Page surfaces |

### Typography

- **Sans-serif stack:** `'Trebuchet MS', 'Avenir Next', sans-serif` (friendly-humanist, rounded feel).
- Display headings: tighter tracking (`-0.02em`), semi-bold for emphasis words in *italics*.
- Body: 14–16px, relaxed leading (1.5–1.6).
- Monospace (`font-mono`): contract addresses, invoice IDs, code.

### Logo & mark

- Crescent-moon mark (footer `footer-crescent` + desktop logo `night-desk-logo.png`) — moon/night implied by "Night Desk".
- On dark: crisp on ink/navy. On light: always the accent orange `#FF6A00`/`#f47c20`.
- Mascot: the orange robot financial assistant used in the hero visual (companion, not a logo).

### Shape language

- Fully rounded corners (14px–28px) — soft, approachable cards.
- Orbit rings and coin motifs in hero visuals (private settlement orbit).
- Soft shadows with a blue tint: `rgba(45,55,100,0.08)`.
- Generous whitespace; dense only inside the `/desk` workspace.

## 7. Brand assets & files

- Logo: `frontend-landing/public/night-desk-logo.png`
- Placeholder: `frontend-landing/public/placeholder-logo.png`
- Hero art: `frontend-landing/public/privacy-wallet.png`, `privacy-receipt.png`, `privacy-payment.png`, `privacy-coins.png`
- CSS source of truth: `frontend-landing/app/globals.css`

## 8. Do / don't

**Do**
- Emphasize selective disclosure: "You choose what to disclose."
- Show the redacted ledger (`id`, `status`, `••••`) as proof.
- Use the moon mark consistently.

**Don't**
- Don't invent product metrics (no fake "50,000+ users").
- Don't claim custody/control over user funds.
- Don't imply data is public that is private.
- Don't use other wallets' branding as our own — Lace is a partner integration.

## 9. Related docs

- `x-profile.md` — social profile and content plan.
- `README.md` — product, privacy model, setup.
- `user-guide.md` — reviewer walkthrough.