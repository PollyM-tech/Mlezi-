import { useEffect, useRef, useState } from 'react'

export default function Turnstile({ onToken, reset }) {
  const container = useRef(null), callback = useRef(onToken)
  const [failed, setFailed] = useState(false)
  useEffect(() => { callback.current = onToken }, [onToken])
  useEffect(() => {
    let stopped = false, widget
    const mount = () => {
      if (stopped || !window.turnstile) return
      widget = window.turnstile.render(container.current, { sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, action: 'support', callback: token => callback.current(token), 'expired-callback': () => callback.current(''), 'error-callback': () => { callback.current(''); setFailed(true) } })
    }
    let script = document.getElementById('mlezi-turnstile')
    if (!script) {
      script = document.createElement('script'); script.id = 'mlezi-turnstile'; script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true
      document.head.appendChild(script)
    }
    const fail = () => setFailed(true)
    if (window.turnstile) mount()
    else { script.addEventListener('load', mount); script.addEventListener('error', fail) }
    return () => { stopped = true; script.removeEventListener('load', mount); script.removeEventListener('error', fail); if (widget !== undefined) window.turnstile?.remove(widget) }
  }, [reset])
  return <><div ref={container} />{failed && <p role="alert">Spam protection could not load. Refresh this page and try again.</p>}</>
}
