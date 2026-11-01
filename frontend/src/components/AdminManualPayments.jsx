import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { MANUAL_MPESA } from "../../convex/lib/manualPaymentPolicy.js";
export default function AdminManualPayments() {
  const [cursor, setCursor] = useState(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const data = useQuery(api.manualPayments.pending, cursor ? { cursor } : {}),
    review = useMutation(api.manualPayments.review);
  async function decide(event, id) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      approve = event.nativeEvent.submitter.value === "approve";
    setError("");
    setMessage("");
    if (approve && !form.has("confirmed")) {
      setError(
        "Confirm the match against the business statement before activating.",
      );
      return;
    }
    if (!approve && !String(form.get("reason") || "").trim()) {
      setError("Enter a reason before rejecting this report.");
      return;
    }
    setBusy(true);
    try {
      await review({
        id,
        approve,
        confirmed: form.has("confirmed"),
        reason: String(form.get("reason") || ""),
      });
      setMessage(
        approve
          ? "Payment confirmed and membership activated."
          : "Payment report rejected. The member can see your reason.",
      );
    } catch (e) {
      setError(
        typeof e.data === "string"
          ? e.data
          : e.data?.message || "Unable to review payment.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card form-section">
      <h2>Manual M-Pesa confirmations</h2>
      <p>
        Match each receipt against money actually received on Paybill{" "}
        {MANUAL_MPESA.paybill}, account {MANUAL_MPESA.account}. Confirm the
        exact receipt, sender phone and amount. A submitted code is not proof of
        payment.
      </p>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p>Loading payment reports…</p>
      ) : !data.payments.length ? (
        <p>No payments awaiting confirmation.</p>
      ) : (
        data.payments.map((p) => (
          <form
            className="review-item"
            key={p.id}
            onSubmit={(e) => decide(e, p.id)}
          >
            <h3>
              KES {p.amount} · {p.plan_code?.replaceAll("_", " ")}
            </h3>
            <p>
              {p.account.name || p.account.role} · {p.account.email}
            </p>
            <p>
              Receipt: <strong>{p.receipt}</strong> · Paying phone: {p.phone}
            </p>
            <p>Submitted: {new Date(p.created_at).toLocaleString()}</p>
            {p.account.restricted && (
              <p>Account restricted; resolve before activating.</p>
            )}
            <label className="checkbox-label">
              <input name="confirmed" type="checkbox" disabled={busy} />I
              matched the receipt, sender, full amount and destination against
              the business statement.
            </label>
            <label>
              Reason if not confirmed
              <textarea name="reason" maxLength={1000} disabled={busy} />
            </label>
            <div className="action-row">
              <button
                className="button primary"
                name="decision"
                value="approve"
                disabled={busy || p.account.restricted}
              >
                Confirm and activate
              </button>
              <button
                className="button secondary"
                name="decision"
                value="reject"
                disabled={busy}
              >
                Reject report
              </button>
            </div>
          </form>
        ))
      )}
      <div className="action-row">
        {cursor && (
          <button
            className="button secondary"
            onClick={() => setCursor(undefined)}
          >
            First page
          </button>
        )}
        {data?.cursor && (
          <button
            className="button secondary"
            onClick={() => setCursor(data.cursor)}
          >
            More payment reports
          </button>
        )}
      </div>
    </section>
  );
}
