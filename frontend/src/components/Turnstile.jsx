import { useEffect, useRef, useState } from 'react'

export default function Turnstile({ onToken, reset }) {
  const container = useRef(null), callback = useRef(onToken)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { callback.current = onToken }, [onToken])
  useEffect(() => {
    let stopped = false, widget
    const mount = () => {
      if (stopped || !window.turnstile) return
      try {
        widget = window.turnstile.render(container.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, action: 'support', size: 'compact',
          callback: token => { if (!stopped) { setFailed(false); callback.current(token) } },
          'expired-callback': () => { if (!stopped) callback.current('') },
          'timeout-callback': () => { if (!stopped) callback.current('') },
          'error-callback': () => { if (!stopped) { callback.current(''); setFailed(true) } },
        })
      } catch { if (!stopped) { callback.current(''); setFailed(true) } }
    }
    let script = document.getElementById('mlezi-turnstile')
    if (script?.dataset.failed === 'true') { script.remove(); script = null }
    if (!script) {
      script = document.createElement('script'); script.id = 'mlezi-turnstile'; script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true
      document.head.appendChild(script)
    }
    const fail = () => { script.dataset.failed = 'true'; callback.current(''); setFailed(true) }
    if (window.turnstile) mount()
    else { script.addEventListener('load', mount); script.addEventListener('error', fail) }
    return () => { stopped = true; script.removeEventListener('load', mount); script.removeEventListener('error', fail); if (widget !== undefined) window.turnstile?.remove(widget) }
  }, [reset, attempt])
  return <><div ref={container} />{failed && <div role="alert"><p>Spam protection could not complete. Check your connection and try again.</p><button type="button" className="button secondary" onClick={() => { callback.current(''); setFailed(false); setAttempt(value => value + 1) }}>Retry spam-protection check</button></div>}</>
}
