import { Component } from 'react'

export default class AdminBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { window.dispatchEvent(new Event('mlezi-security-required')) }
  render() {
    if (this.state.failed) return <main className="card state-panel"><h1>Administrator session needs attention</h1><p>We could not load the administration tools. Reopen the dashboard to check your connection and security session.</p><a className="button primary" href="/admin-mlezicareaccess" onClick={event => { event.preventDefault(); window.location.assign('/admin-mlezicareaccess') }}>Reopen administrator dashboard</a></main>
    return this.props.children
  }
}
