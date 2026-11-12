import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleCheck, Fingerprint, Globe2, LockKeyhole, Network, ShieldCheck, Waypoints } from 'lucide-react';
import { api } from '../api';
import { MeResponse } from '../types';
import './public-entry.css';

const identities = [
  { id: 'a1-trader', label: 'Bank A1 Trader', detail: 'India · initiate trades' },
  { id: 'a1-approver', label: 'Bank A1 Approver', detail: 'India · approve and settle' },
  { id: 'b1-trader', label: 'Bank B1 Trader', detail: 'Singapore · initiate trades' },
  { id: 'b1-approver', label: 'Bank B1 Approver', detail: 'Singapore · approve and settle' },
  { id: 'rega-operator', label: 'RegA Supervisor', detail: 'India · INR corridor' },
  { id: 'regb-operator', label: 'RegB Supervisor', detail: 'Singapore · SGD corridor' },
  { id: 'aud-reader', label: 'Consortium Auditor', detail: 'Independent review' },
];

const journey = [
  {
    number: '01', title: 'Agree the trade', kicker: 'Trade proposal',
    body: 'A bank trader prepares the bilateral terms. The counterparty approver reviews the proposal before the payment moves forward.',
    fact: 'Two bank roles · one shared record', icon: Waypoints,
  },
  {
    number: '02', title: 'Confirm test funding', kicker: 'Sandbox capture',
    body: 'The proposing bank explicitly captures a PayPal Sandbox order. A captured payment is recorded as funding, not as a completed Fabric settlement.',
    fact: 'Separate provider confirmation', icon: CircleCheck,
  },
  {
    number: '03', title: 'Commit the settlement', kicker: 'Fabric test ledger',
    body: 'Authorized operators submit the Fabric settlement and its value legs. Each ledger write has a visible status for review and reconciliation.',
    fact: 'Explicit on-ledger actions', icon: Network,
  },
];

const roleCards = [
  { number: '01', title: 'Bank traders', body: 'Prepare proposals, review liquidity, and follow each trade from initiation.', icon: Waypoints },
  { number: '02', title: 'Bank approvers', body: 'Accept counterparty terms and confirm funding and authorized test-ledger actions.', icon: Fingerprint },
  { number: '03', title: 'Oversight teams', body: 'Inspect corridor controls, receipts, events, and the settlement trail.', icon: ShieldCheck },
];

export function PublicEntry({ onSignedIn }: { onSignedIn: (profile: MeResponse) => void }) {
  const [showLogin, setShowLogin] = useState(false);
  const [operator, setOperator] = useState('a1-trader');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-pb-reveal]');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('pb-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('pb-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!showLogin) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLSelectElement>('select')?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showLogin]);

  function openLogin() {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setError('');
    setShowLogin(true);
  }

  function closeLogin() {
    setShowLogin(false);
    setPassword('');
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }

  function handleDialogKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { closeLogin(); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.login(operator, password);
      api.setSession(result.token);
      setPassword('');
      onSignedIn(result.profile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  const active = journey[activeStep];
  const ActiveIcon = active.icon;

  return <div className="pb-landing">
    <a className="pb-skip" href="#pb-main">Skip to content</a>
    <header className="pb-header"><div className="pb-container pb-header-inner">
      <a className="pb-brand" href="#top" aria-label="CorridorFlow home"><img className="pb-brand-logo" src="/corridorflow-logo.png" alt="CorridorFlow" /></a>
      <nav className="pb-nav" aria-label="Public navigation"><a href="#how-it-works">How it works</a><a href="#workspaces">Workspaces</a></nav>
      <button className="pb-header-login" type="button" onClick={openLogin}>Operator sign in <ArrowUpRight aria-hidden="true" size={16} /></button>
    </div></header>

    <main id="pb-main">
      <section className="pb-hero" id="top" aria-labelledby="pb-hero-title"><div className="pb-hero-grid" aria-hidden="true" /><div className="pb-container pb-hero-layout">
        <div className="pb-hero-copy">
          <div className="pb-eyebrow"><span className="pb-eyebrow-dot" /> Cross-border treasury, made visible</div>
          <h1 id="pb-hero-title">Every payment has a path. <em>See the whole journey.</em></h1>
          <p>From bank approval to Sandbox funding and Fabric test settlement, CorridorFlow brings the moving parts of cross-border trade into one clear workspace.</p>
          <div className="pb-hero-actions"><button className="pb-button-primary" type="button" onClick={openLogin}>Open your workspace <ArrowRight aria-hidden="true" size={18} /></button><a className="pb-link-button" href="#how-it-works">Explore the flow <ChevronRight aria-hidden="true" size={18} /></a></div>
          <div className="pb-hero-note"><ShieldCheck aria-hidden="true" size={17} /> Human approval at every test-ledger write</div>
        </div>
        <div className="pb-scene" aria-label="Illustration of a payment route between India and Singapore">
          <div className="pb-scene-top"><span><span className="pb-live-dot" /> BILATERAL ROUTE</span><span>INR / SGD</span></div>
          <div className="pb-scene-route"><div className="pb-bank pb-bank-a"><span className="pb-bank-icon">IN</span><span className="pb-bank-label">BANK A1</span><strong>India</strong><small>Trade origin</small></div><div className="pb-route-center" aria-hidden="true"><div className="pb-route-line"><span className="pb-route-progress" /></div><div className="pb-route-symbol"><ArrowRight size={19} /></div></div><div className="pb-bank pb-bank-b"><span className="pb-bank-icon">SG</span><span className="pb-bank-label">BANK B1</span><strong>Singapore</strong><small>Counterparty</small></div></div>
          <div className="pb-scene-status"><span className="pb-status-icon"><Check size={16} /></span><div><small>ILLUSTRATIVE WORKFLOW</small><strong>Funding confirmed. Settlement pending.</strong></div><span className="pb-status-pill">TEST</span></div>
          <div className="pb-scene-footer"><span>01 <b>Trade</b></span><span>02 <b>Funding</b></span><span>03 <b>Settlement</b></span></div>
        </div>
      </div></section>

      <section className="pb-proof" aria-label="Platform principles"><div className="pb-container pb-proof-grid"><div><Globe2 aria-hidden="true" size={20} /><span>Cross-border by design</span></div><div><Fingerprint aria-hidden="true" size={20} /><span>Human-approved actions</span></div><div><Network aria-hidden="true" size={20} /><span>Visible settlement trail</span></div></div></section>

      <section className="pb-section pb-journey" id="how-it-works" aria-labelledby="pb-flow-title"><div className="pb-container">
        <div className="pb-section-heading" data-pb-reveal><span className="pb-section-kicker">THE PAYMENT JOURNEY</span><h2 id="pb-flow-title">A sequence you can follow.</h2><p>Each transition is deliberate. The interface shows where a trade stands and what still needs a human decision.</p></div>
        <div className="pb-journey-layout" data-pb-reveal><div className="pb-step-list" aria-label="Payment journey steps">{journey.map((step, index) => <button key={step.number} type="button" className={`pb-step ${activeStep === index ? 'pb-step-active' : ''}`} onClick={() => setActiveStep(index)} aria-pressed={activeStep === index}><span className="pb-step-number">{step.number}</span><span className="pb-step-copy"><small>{step.kicker}</small><strong>{step.title}</strong></span><ArrowUpRight aria-hidden="true" size={18} /></button>)}</div>
          <div className="pb-step-detail" key={activeStep} aria-live="polite"><div className="pb-step-detail-top"><span>CORRIDORFLOW / FLOW {active.number}</span><span className="pb-step-detail-icon"><ActiveIcon aria-hidden="true" size={24} /></span></div><div className="pb-step-art" aria-hidden="true"><span className="pb-art-node pb-art-node-left" /><span className="pb-art-path" /><span className="pb-art-node pb-art-node-right" /></div><div><span className="pb-detail-kicker">{active.kicker}</span><h3>{active.title}</h3><p>{active.body}</p><div className="pb-detail-fact"><CircleCheck aria-hidden="true" size={17} />{active.fact}</div></div></div>
        </div>
      </div></section>

      <section className="pb-section pb-roles" id="workspaces" aria-labelledby="pb-roles-title"><div className="pb-container"><div className="pb-section-heading" data-pb-reveal><span className="pb-section-kicker">BUILT FOR EVERY PARTICIPANT</span><h2 id="pb-roles-title">One platform. The right view for your role.</h2><p>Banking, approval, and oversight work stays focused on the actions each operator is allowed to take.</p></div><div className="pb-role-grid">{roleCards.map(({ number, title, body, icon: Icon }) => <article className="pb-role-card" data-pb-reveal key={number}><div className="pb-role-top"><span>{number} / 03</span><Icon aria-hidden="true" size={24} /></div><div><h3>{title}</h3><p>{body}</p></div><span className="pb-role-rule" /></article>)}</div></div></section>

      <section className="pb-final" aria-labelledby="pb-final-title"><div className="pb-container pb-final-inner" data-pb-reveal><div><span className="pb-section-kicker">YOUR WORKSPACE IS READY</span><h2 id="pb-final-title">Move with clarity.</h2><p>Sign in to see your trades, controls, and next actions.</p></div><button className="pb-button-primary" type="button" onClick={openLogin}>Operator sign in <ArrowRight aria-hidden="true" size={18} /></button></div></section>
    </main>

    <footer className="pb-footer"><div className="pb-container pb-footer-inner"><span className="pb-brand pb-brand-footer"><img className="pb-brand-logo" src="/corridorflow-logo.png" alt="CorridorFlow" /></span><p>Hackathon prototype · PayPal Sandbox and Fabric test funds only. Sample data is labelled in the workspace.</p></div></footer>

    {showLogin && <div className="pb-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLogin(); }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pb-login-title" aria-describedby="pb-login-description" className="pb-dialog" onKeyDown={handleDialogKeys}>
      <div className="pb-dialog-head"><div className="pb-dialog-mark"><LockKeyhole aria-hidden="true" size={20} /></div><button className="pb-dialog-close" type="button" onClick={closeLogin} aria-label="Close sign in">×</button></div><span className="pb-section-kicker">OPERATOR ACCESS</span><h2 id="pb-login-title">Welcome back.</h2><p id="pb-login-description">Choose your assigned role and enter its demo password.</p>
      <form onSubmit={signIn} className="pb-login-form"><label htmlFor="pb-operator">Workspace</label><select id="pb-operator" value={operator} onChange={(event) => setOperator(event.target.value)}>{identities.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.detail}</option>)}</select><label htmlFor="pb-password">Password</label><input id="pb-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{error && <p className="pb-form-error" role="alert">{error}</p>}<button className="pb-button-primary pb-login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Continue to workspace'} <ArrowRight aria-hidden="true" size={18} /></button></form><p className="pb-login-note">Your access is limited to your assigned role. Sessions expire after eight hours.</p>
    </div></div>}
  </div>;
}
