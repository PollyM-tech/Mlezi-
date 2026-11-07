import { Component } from 'react'

export default class AccountServiceBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-shell"><section className="card state-panel" role="alert">
      <h1>We couldn’t load your account</h1>
      <p>The account service is temporarily unavailable. Please try again shortly.</p>
      <button className="button primary" onClick={() => window.location.reload()}>Try again</button>
      <p><a href="/">Return to Mlezi home</a> · <a href="/support/">Contact support</a></p>
    </section></main>
  }
}
