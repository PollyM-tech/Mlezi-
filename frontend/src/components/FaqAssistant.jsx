import { useEffect, useId, useRef, useState } from 'react'
import { FAQ_TOPICS, findFaqs } from '../lib/faq.js'
import '../faq-assistant.css'

export default function FaqAssistant() {
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [topic, setTopic] = useState('all'), [selected, setSelected] = useState(null)
  const launcher = useRef(null), search = useRef(null), answer = useRef(null)
  const id = useId(), results = findFaqs(query, topic)
  function close() { setOpen(false); setQuery(''); setTopic('all'); setSelected(null); launcher.current?.focus() }
  useEffect(() => { if (open) search.current?.focus() }, [open])
  useEffect(() => { if (selected) answer.current?.focus() }, [selected])
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(''); setTopic('all'); setSelected(null); launcher.current?.focus() } }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])
  return <div className="faq-assistant">
    <button className="faq-launcher" ref={launcher} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => open ? close() : setOpen(true)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 13h5"/></svg>Mlezi Help</button>
    {open && <section className="faq-panel" id={`${id}-panel`} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}>
      <header className="faq-header"><div><span>QUICK ANSWERS</span><h2 id={`${id}-title`}>A little help.</h2></div><button className="faq-close" onClick={close} aria-label="Close Mlezi Help">×</button></header>
      <div className="faq-body"><p id={`${id}-intro`}>Find an answer or reach our support team. These are written FAQs, not live chat.</p>
        <label htmlFor={`${id}-search`}>Search help</label><input id={`${id}-search`} ref={search} type="search" autoComplete="off" maxLength={120} placeholder="e.g. password or travel nanny" value={query} onChange={event => { setQuery(event.target.value); setSelected(null) }} />
        <label htmlFor={`${id}-topic`}>Topic</label><select id={`${id}-topic`} value={topic} onChange={event => { setTopic(event.target.value); setSelected(null) }}>{Object.entries(FAQ_TOPICS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        {selected ? <section className="faq-answer" aria-label="Answer"><h3 ref={answer} tabIndex={-1}>{selected.question}</h3><p>{selected.answer}</p><div className="faq-answer-links">{selected.links.map(link => <a key={link.href} href={link.href}>{link.label} <span aria-hidden="true">↗</span></a>)}</div><button className="faq-back" onClick={() => { setSelected(null); search.current?.focus() }}>← More questions</button></section> : <><p className="faq-count" role="status">{results.length ? `${results.length} ${results.length === 1 ? 'answer' : 'answers'} available` : 'No matching answer yet.'}</p>{results.length ? <ul className="faq-questions">{results.map(entry => <li key={entry.id}><button onClick={() => setSelected(entry)}>{entry.question}<span aria-hidden="true">›</span></button></li>)}</ul> : <p>Try a shorter phrase or another topic. Our support form can help with questions not covered here.</p>}</>}
      </div><footer className="faq-footer"><a href="/support/">Still need help? Open a support ticket ↗</a><small>Your search stays on this page and is not saved.</small></footer>
    </section>}
  </div>
}
