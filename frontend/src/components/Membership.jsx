import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

import StkPayment from './StkPayment.jsx';

export default function Membership({ user }) {
  const [membership, setMembership] = useState(null),
    [payments, setPayments] = useState([]),
    [selected, setSelected] = useState("");
  const [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const refreshPayments = useCallback(payment => {
    if (payment) setPayments(current => [payment, ...current.filter(item => item.id !== payment.id)]);
    setVersion(v => v + 1);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([api("/memberships"), api("/payments")])
      .then(([status, history]) => {
        if (active) {
          setMembership(status);
          setPayments(history.payments);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [version]);
  const pending = payments.find(
    (p) => p.status === "pending" && !(p.environment === "sandbox" && membership?.payment_environment === "production"),
  );
  const refreshablePaymentId = pending && (pending.provider !== 'daraja_stk' || !membership?.payments_enabled) ? pending.id : null;
  useEffect(() => {
    if (!refreshablePaymentId) return;
    let active = true, inFlight = false;
    const timer = setInterval(async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const [status, history] = await Promise.all([api('/memberships'), api('/payments')]);
        if (active) { setMembership(status); setPayments(history.payments); }
      } catch { /* Keep the last known state; the next read can recover. */ }
      finally { inFlight = false; }
    }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [refreshablePaymentId]);
  const plan =
    membership?.plans.find(
      (p) => p.code === (selected || pending?.plan_code),
    ) || membership?.plans[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYMENTS</span>
          <h1>
            {user.role === "employer"
              ? "Make your next connection."
              : "Let your care be seen."}
          </h1>
          <p>
            {user.role === "employer"
              ? "Unlock new caregiver contacts with a contact-access pass."
              : "Optional Premium visibility. Identity review remains separate."}
          </p>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {!membership ? (
        <p>Loading membership…</p>
      ) : (
        <div className="dashboard-grid membership-layout">
          <section className="card form-section">
            <span className="badge">
              {membership.active ? "Active" : "Inactive"}
            </span>
            <h2>
              {user.role === "employer"
                ? "Your contact-access pass"
                : "Your Premium membership"}
            </h2>
            {membership.expires_at && (
              <p>Expiry: {new Date(membership.expires_at).toLocaleString()}</p>
            )}
            {plan ? (
              <>
                <h3>Payment options</h3>
                <label>
                  Choose your plan
                  <select
                    value={plan.code}
                    disabled={!!pending}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {membership.plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        KES {p.stk_amount ?? p.amount} · {p.days} days
                      </option>
                    ))}
                  </select>
                </label>
                {membership.payments_enabled ? <StkPayment plan={{...plan, amount: plan.stk_amount ?? plan.amount}} pending={pending} environment={membership.payment_environment} user={user} onRefresh={refreshPayments} /> : <section className="privacy-note" aria-label="M-Pesa payment availability">
                  <h3>Pay with M-Pesa</h3>
                  <p>KES {plan.amount} · {plan.days} days</p>
                  <p role="status">M-Pesa STK payments are currently unavailable. Please try again later.</p>
                  <button type="button" className="button primary" disabled>Payment temporarily unavailable</button>
                  <p>Need help with a payment? <a href="/tickets">Contact Support</a>.</p>
                </section>}

              </>
            ) : (
              <p>No membership plans are available right now. <a href="/tickets">Contact Support</a>.</p>
            )}
          </section>
          <aside className="card side-card">
            <p>
              {user.role === "employer"
                ? "Previously unlocked contacts remain accessible after ordinary pass expiry. Renew to unlock new contacts."
                : "Premium gives rotating priority among matching profiles. It does not grant identity approval, ratings or guaranteed work."}
            </p>
            <p>
              For a mistaken, duplicate or unrecognized payment, contact{" "}
              <a href="/tickets">Support</a>. Do not send another payment until
              the issue is checked.
            </p>
          </aside>
        </div>
      )}
      <section className="card form-section">
        <h2>Recent payments</h2>
        {payments.length ? (
          payments.map((p) => (
            <article className="payment-row" key={p.id}>
              <div>
                <p>
                  KES {p.amount} · {p.plan_code?.replaceAll("_", " ") || p.type}
                </p>
                {p.receipt && <p>Receipt: {p.receipt}</p>}
                {p.environment === "sandbox" && <p>Sandbox test</p>}
                <small>{p.result_description}</small>
              </div>
              <strong>
                {p.status === "completed"
                  ? "Confirmed"
                  : p.status === "failed"
                    ? "Not confirmed"
                    : p.status === "pending"
                      ? p.provider === "daraja_stk" ? "Awaiting confirmation" : "Awaiting review"
                      : p.status}
              </strong>
            </article>
          ))
        ) : (
          <p>No payments yet.</p>
        )}
      </section>
    </>
  );
}
