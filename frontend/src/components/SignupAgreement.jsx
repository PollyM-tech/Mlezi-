export default function SignupAgreement({ checked, onChange, disabled = false }) {
  return <label className="checkbox-label signup-agreement"><input name="termsAccepted" type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} disabled={disabled} /><span>I am at least 18, agree to the <a href="/terms/" target="_blank" rel="noopener">Terms of use</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy notice</a>.</span></label>
}
