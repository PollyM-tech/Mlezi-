import { LEGAL_VERSION } from '../../convex/lib/legalPolicy.js'
import { legalConfiguration } from '../lib/legal.js'
import { LEGAL_CONTENT } from '../lib/legal-content.js'

export default function LegalPage({ type }) {
  const legal = legalConfiguration(import.meta.env)
  const content = LEGAL_CONTENT[type]
  if (!content) return <article className="card form-section legal-page"><h1>Legal information</h1><a href="/terms/">Terms of use</a></article>
  return <article className="card form-section legal-page">
    <a href="/">← Mlezi home</a><h1>{content.title}</h1><p>Updated 14 November 2026 · Version {LEGAL_VERSION}</p>
    <section className="legal-operator" aria-labelledby="operator-heading"><h2 id="operator-heading">Operator and contact point</h2><dl><dt>Service name</dt><dd>{legal.entity}</dd>{legal.proprietor && <><dt>Proprietor</dt><dd>{legal.proprietor}</dd></>}{legal.structure && <><dt>Business structure</dt><dd>{legal.structure}</dd></>}{legal.registration && <><dt>Registration number</dt><dd>{legal.registration}</dd></>}{legal.address && <><dt>Business/service address</dt><dd className="preserve-lines">{legal.address}</dd></>}<dt>Support and privacy requests</dt><dd><a href="/support/">Mlezi Support</a> · <a href="/privacy-account">Privacy and account</a></dd></dl></section>
    <nav className="legal-contents" aria-label="On this page">{content.sections.map((section, index) => <a key={section.id} href={`#${type}-${section.id}`}>{index + 1}. {section.title}</a>)}</nav>
    {content.sections.map((section, index) => <section key={section.id} id={`${type}-${section.id}`}><h2>{index + 1}. {section.title}</h2>{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}</section>)}
    {type === 'privacy' && <p>You may <a href="https://www.odpc.go.ke/file-a-complaint/">file a complaint with the Office of the Data Protection Commissioner</a>.</p>}
    <footer className="legal-links"><a href="/privacy/">Privacy</a> · <a href="/cookies/">Cookies</a> · <a href="/terms/">Terms</a> · <a href="/support/">Support</a></footer>
  </article>
}
