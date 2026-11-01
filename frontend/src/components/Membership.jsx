import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api as functions } from "../../convex/_generated/api.js";
import { api } from "../lib/api";

export default function Membership({ user }) {
  const [membership, setMembership] = useState(null),
    [payments, setPayments] = useState([]),
    [selected, setSelected] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const submit = useMutation(functions.manualPayments.submit);
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
    (p) => p.provider === "manual_mpesa" && p.status === "pending",
  );
  const plan =
    membership?.plans.find(
      (p) => p.code === (selected || pending?.plan_code),
    ) || membership?.plans[0];
  async function report(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submit({
        planCode: plan.code,
        receipt: String(fields.get("receipt") || ""),
        phone: String(fields.get("phone") || ""),
      });
      setMessage(
        "Payment report received. Access activates after an administrator checks the business statement.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setError(
        typeof e.data === "string"
          ? e.data
          : e.data?.message ||
              e.message ||
              "Unable to submit your payment report.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MEMBERSHIP</span>
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
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
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
            {membership.manual_payment?.enabled && plan ? (
              <>
                <label>
                  Choose your plan
                  <select
                    value={plan.code}
                    disabled={busy || !!pending}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {membership.plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        KES {p.amount} · {p.days} days
                      </option>
                    ))}
                  </select>
                </label>
                <section
                  className="privacy-note"
                  aria-label="Manual M-Pesa instructions"
                >
                  <h3>Pay manually with M-Pesa</h3>
                  <ol>
                    <li>Open M-Pesa → Lipa na M-Pesa → Pay Bill.</li>
                    <li>
                      Business number:{" "}
                      <strong>{membership.manual_payment.paybill}</strong>
                    </li>
                    <li>
                      Account number:{" "}
                      <strong>{membership.manual_payment.account}</strong>
                    </li>
                    <li>
                      Amount: <strong>KES {plan.amount}</strong> for {plan.days}{" "}
                      days.
                    </li>
                    <li>
                      Check the business details shown by M-Pesa, then confirm
                      in M-Pesa.
                    </li>
                  </ol>
                  <p>
                    Return here and submit the receipt code. Never share your
                    M-Pesa PIN or an OTP. If the business details look wrong,
                    cancel and use Support.
                  </p>
                </section>
                {pending ? (
                  <div className="privacy-note">
                    <p role="status">
                      Receipt {pending.receipt} is awaiting administrator
                      review. Do not pay again while it is pending.
                    </p>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setVersion((v) => v + 1)}
                    >
                      Refresh payment status
                    </button>
                    <p>
                      <a href="/tickets">Contact support about this payment</a>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={report}>
                    <label>
                      M-Pesa receipt code
                      <input
                        name="receipt"
                        autoComplete="off"
                        maxLength={10}
                        minLength={10}
                        pattern="[A-Za-z0-9]{10}"
                        placeholder="10-character receipt code"
                        required
                        disabled={busy}
                      />
                    </label>
                    <label>
                      Phone number used to pay
                      <input
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        defaultValue={user.phone || ""}
                        maxLength={32}
                        required
                        disabled={busy}
                      />
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" required disabled={busy} />I have
                      paid KES {plan.amount} to this Paybill and account.
                    </label>
                    <button className="button primary" disabled={busy}>
                      {busy ? "Submitting…" : "Submit payment for confirmation"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p>Manual payment reporting is currently unavailable.</p>
            )}
          </section>
          <aside className="card side-card">
            <h3>How it works</h3>
            <p>
              An administrator matches your receipt, amount, phone and payment
              destination against the business statement. Submitting a code
              alone does not activate access.
            </p>
            <p>
              Early renewal extends your existing expiry. There are no automatic
              debits. Paystack checkout will be added later.
            </p>
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
                <small>{p.result_description}</small>
              </div>
              <strong>
                {p.status === "completed"
                  ? "Confirmed"
                  : p.status === "failed"
                    ? "Not confirmed"
                    : p.status === "pending"
                      ? "Awaiting review"
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
