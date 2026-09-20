'use client'

const robotImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%2818%29-C9AF0wfHW2WX72GH9oZkKwVjmxYpfc.jpg'

const features = [
  { label: 'Private invoices', detail: 'Keep amounts off-chain', icon: '↗', tone: 'orange' },
  { label: 'Selective proof', detail: 'Share only what matters', icon: '▣', tone: 'blue' },
  { label: 'Lace control', detail: 'You hold the keys', icon: '◌', tone: 'navy' },
  { label: 'Settlement status', detail: 'Verify without disclosure', icon: '⌁', tone: 'gold' },
]

const steps = [
  {
    name: 'Create',
    title: 'Write it privately.',
    description: 'You write the amount and memo. The amount never hits the public ledger.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%2820%29-GvtpVK1ekzYcLvgV3Ze8AUFTHXQnzV.jpg',
    alt: 'Receipt invoice on an orange phone',
  },
  {
    name: 'Accept',
    title: 'Share with confidence.',
    description: 'The vendor sees the number. The explorer still shows ••••.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%2821%29-X5ejUeS9MHV9YEaHNdasC0XGqIHHNV.jpg',
    alt: 'Hands exchanging a gold payment coin',
  },
  {
    name: 'Settle',
    title: 'Make it verifiable.',
    description: 'The status flips to Settled. Anyone can verify the payment happened; they cannot scrape the size.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%2819%29-cCjCnvZ9pKtVmhFw3aQE4bnYzWQdMO.jpg',
    alt: 'Orange receipt ledger with floating payment symbols',
  },
]

const processSteps = [
  { number: '01', title: 'Write privately', description: 'Add the amount and memo on your device. Your invoice details stay yours.', tone: 'orange' },
  { number: '02', title: 'Share with confidence', description: 'Send the invoice to a vendor while the public explorer keeps the amount private.', tone: 'orange-soft' },
  { number: '03', title: 'Make it verifiable', description: 'Once accepted, the payment status becomes a clear, public proof of settlement.', tone: 'navy' },
  { number: '04', title: 'Stay in control', description: 'Settle, cancel, and audit without handing Night Desk custody of your funds.', tone: 'blue' },
]

const infographicCards = [
  { icon: '◈', title: 'Protocol teams', text: 'Grants, audits, and retainers without publishing the number.', tone: 'orange' },
  { icon: '⌂', title: 'Studios and agencies', text: 'Client or contractor invoices; amount stays off the explorer.', tone: 'blue' },
  { icon: '▥', title: 'OTC / desks', text: 'One-off settlement, size not sitting in a wallet dossier.', tone: 'navy' },
  { icon: '↗', title: 'Remote contractors', text: 'Send a bill, get paid, no public rate card.', tone: 'steel' },
  { icon: '◎', title: 'DAO / multisig ops', text: 'Pay a vendor, prove it settled, don’t leak the budget line.', tone: 'slate' },
  { icon: '✓', title: 'Funds and treasuries', text: 'Selective disclosure for an auditor, not a CSV dump for the timeline.', tone: 'gold' },
]

function PrivacyInfographic() {
  return (
    <section className="infographic-section" id="who-its-for" aria-labelledby="infographic-heading">
      <div className="infographic-heading"><p className="eyebrow"><span className="eyebrow-dot" /> Who it&apos;s for</p><h2 id="infographic-heading">For teams that need a private bill</h2><p>Six buyers. One private settlement flow.</p></div>
      <div className="infographic-map">
        <svg className="infographic-connectors" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><path d="M145 140 C145 190 245 190 300 285" /><path d="M500 140 C500 205 500 220 500 285" /><path d="M855 140 C855 190 755 190 700 285" /><path d="M145 480 C145 430 245 430 300 335" /><path d="M500 480 C500 415 500 400 500 335" /><path d="M855 480 C855 430 755 430 700 335" /></svg>
        <div className="infographic-card-grid">
          {infographicCards.map((card) => (
            <article className={`infographic-card infographic-card-${card.tone}`} key={card.title}>
              <span className="infographic-icon" aria-hidden="true">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <div className="infographic-core">
          <h2 id="infographic-title">PRIVATE BILL</h2>
          <p>Private by default. Verifiable when needed.</p>
        </div>
      </div>
    </section>
  )
}

function ComparisonSection() {
  const leftItems = [
    ['01', 'Private amount', 'The number stays off the public ledger.', 'orange'],
    ['02', 'No custody', 'You keep control of funds and keys.', 'blue'],
    ['03', 'Selective proof', 'Share one settlement with an auditor.', 'navy'],
    ['04', 'Verifiable status', 'A clear record without a public amount.', 'gold'],
  ]
  const rightItems = [
    ['01', 'Public amount', 'The size becomes part of the timeline.', 'gold'],
    ['02', 'Wallet dossier', 'Balances and counterparties stay exposed.', 'orange'],
    ['03', 'CSV disclosure', 'Proof means exporting the whole book.', 'blue'],
    ['04', 'Permanent exposure', 'Every detail stays attached to the timeline.', 'navy'],
  ]
  return <section className="comparison-section" id="compare" aria-labelledby="comparison-title"><div className="comparison-heading"><p className="eyebrow"><span className="eyebrow-dot" /> Compare the flow</p><h2 id="comparison-title">Private billing, <em>without the trade-offs.</em></h2><p>See what changes when the amount stays private and settlement stays verifiable.</p></div><div className="comparison-board"><div className="comparison-side comparison-side-left"><div className="comparison-orbit"><span>Night<br />Desk</span></div><div className="comparison-features">{leftItems.map(([number,title,text,tone]) => <div className="comparison-item" key={title}><span className={`comparison-dot comparison-dot-${tone}`}>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div><div className="comparison-vs" aria-hidden="true">VS</div><div className="comparison-side comparison-side-right"><div className="comparison-features">{rightItems.map(([number,title,text,tone]) => <div className="comparison-item" key={title}><span className={`comparison-dot comparison-dot-${tone}`}>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div><div className="comparison-orbit"><span>Public<br />ledger</span></div></div></div></section>
}

function ProcessTimeline() {
  return (
    <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title">
      <div className="workflow-heading">
        <h2 id="workflow-title">One invoice. <em>Three private moments.</em></h2>
        <p>Follow the same payment as it moves from a private draft to a public proof of settlement.</p>
      </div>
      <div className="process-timeline">
        <div className="process-path" aria-hidden="true" />
        {processSteps.map((step, index) => (
          <article className={`process-step process-step-${index % 2 === 0 ? 'right' : 'left'}`} key={step.number}>
            <div className={`process-pill process-pill-${step.tone}`}>
              <div className="process-number">{step.number}</div>
              <div className="process-copy"><h3>{step.title}</h3><p>{step.description}</p></div>
            </div>
          </article>
        ))}
      </div>
      <p className="workflow-tagline">Private invoice. Public settlement tape.</p>
    </section>
  )
}

export default function Page() {
  return (
    <main className="hero-shell">
      <div className="hero-card">
        <header className="site-header">
          <a className="brand" href="#top" aria-label="Night Desk home"><img className="brand-logo" src="/night-desk-logo.png" alt="Night Desk" /></a>
          <nav className="desktop-nav" aria-label="Main navigation"><a className="active" href="#top">Home</a><a href="#how-it-works">How it works</a><a href="#who-its-for">Who it&apos;s for</a><a href="#compare">Compare</a><a href="/desk">Night Desk</a></nav>
          <a className="header-cta" href="/desk">Get Started</a>
        </header>
        <section className="hero-content" id="top">
          <div className="copy-column"><p className="eyebrow"><span className="eyebrow-dot" /> Private settlement</p><h1>Invoices that<br />stay <em>private</em></h1><p className="intro">Create, share, and settle invoices with private amounts and verifiable proof when your team needs it.</p><div className="hero-actions"><a className="primary-button" href="/desk">Get Started <span aria-hidden="true">→</span></a><a className="text-button" href="#how-it-works">See how it works</a></div></div>
          <div className="visual-column" aria-label="Orbit illustration for private invoice settlement"><div className="orbit-ring orbit-ring-one" aria-hidden="true" /><div className="orbit-ring orbit-ring-two" aria-hidden="true" /><div className="coin coin-one" aria-hidden="true">$</div><div className="coin coin-two" aria-hidden="true">$</div><div className="block block-one" aria-hidden="true" /><div className="block block-two" aria-hidden="true" /><img className="robot-image" src={robotImage} alt="Orange robot financial assistant floating with coins" /></div>
        </section>
        <section className="feature-bar" id="features" aria-label="Night Desk features">{features.map((feature) => <div className="feature-item" key={feature.label}><span className={`feature-icon feature-icon-${feature.tone}`} aria-hidden="true">{feature.icon}</span><div><strong>{feature.label}</strong><span>{feature.detail}</span></div></div>)}</section>
      </div>
      <ProcessTimeline />
      <PrivacyInfographic />
      <ComparisonSection />
      <section className="privacy-section" aria-labelledby="privacy-title">
        <div className="privacy-heading">
          <h2 id="privacy-title">Private by default.<br /><em>More control. Better opportunities.</em></h2>
          <p>Night Desk keeps the details private while making every settlement easy to verify.</p>
        </div>
        <div className="privacy-grid">
          <article className="privacy-card"><span className="privacy-cue">••••</span><h3>Smarter tools</h3><p>Amount, memo, and counterparty stay on the device. The ledger only stores invoice id and status. You choose what to disclose.</p><img className="privacy-card-image" src="/privacy-wallet.png" alt="Orange wallet with private financial details" /></article>
          <article className="privacy-card"><span className="privacy-cue">Lace</span><h3>More control</h3><p>You hold the keys. Create, accept, settle, cancel. No Night Desk custody. Rules live in the Compact contract.</p><img className="privacy-card-image" src="/privacy-receipt.png" alt="Receipt on a phone representing controlled payments" /></article>
          <article className="privacy-card"><span className="privacy-cue">Settled</span><h3>Better opportunities</h3><p>Anyone can verify an invoice settled. An auditor can get a proof for one payment without a CSV of the whole book.</p><img className="privacy-card-image" src="/privacy-payment.png" alt="Hands exchanging a coin for a verified payment" /></article>
          <article className="privacy-card"><span className="privacy-cue">Immutable</span><h3>Immutable invoice</h3><p>Once settled, the record is not an editable spreadsheet. The final state stays verifiable for everyone.</p><img className="privacy-card-image" src="/privacy-coins.png" alt="Orange wallet and coins representing an immutable invoice" /></article>
        </div>
      </section>
      <section className="faq-section" id="night-desk" aria-labelledby="faq-title"><div className="faq-heading"><p className="eyebrow"><span className="eyebrow-dot" /> Frequently asked</p><h2 id="faq-title">Private by design.</h2></div><div className="faq-list"><details><summary>Is the amount on-chain?</summary><p>No. The amount stays private; the public record exposes the invoice identity and settlement status.</p></details><details><summary>Do I give you custody?</summary><p>No. You keep control of your funds and keys. Night Desk does not custody your money.</p></details><details><summary>What network is this?</summary><p>Midnight Preview, built for private-by-default applications.</p></details><details><summary>Can an auditor see a payment?</summary><p>Yes. Share proof for a specific payment without exposing the rest of your timeline.</p></details><details><summary>What stays private?</summary><p>Invoice amounts, memos, and counterparty details stay private unless you choose to disclose them.</p></details><details><summary>Can I cancel an invoice?</summary><p>Yes. You control the invoice lifecycle and can cancel it before settlement.</p></details><details><summary>How do I get started?</summary><p>Create an invoice or connect Lace, then share the settlement proof with the right people.</p></details></div><div className="faq-cta"><div><h3>Ready to send a private bill?</h3><p>Create an invoice or connect Lace to get started.</p></div><div className="hero-actions"><a className="primary-button" href="/desk">Create invoice <span aria-hidden="true">→</span></a><a className="text-button" href="/desk">Connect Lace</a></div></div></section><footer className="site-footer"><a className="footer-brand" href="#top" aria-label="Night Desk home"><span className="footer-crescent" aria-hidden="true" />Night Desk</a><nav aria-label="Footer navigation"><a href="#top">Preview</a><a href="#top">Lace</a><a href="#how-it-works">Docs</a></nav></footer><div className="corner-shape corner-shape-left" aria-hidden="true" /><div className="corner-shape corner-shape-right" aria-hidden="true" />
    </main>
  )
}
