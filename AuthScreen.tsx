import { useState } from "react";
import { supabase } from "./supabase";
import { checkEmailExists, registerPlayer } from "./db";
import { THEME } from "./theme";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box",
  background: THEME.bgInput, border: `1.5px solid ${THEME.borderInput}`,
  color: THEME.textPrimary, fontSize: 14, padding: "9px 12px",
  borderRadius: 7, outline: "none", fontFamily: "'Barlow', Arial", marginBottom: 10,
};

const btnStyle: React.CSSProperties = {
  display: "block", width: "100%", background: THEME.green, border: "none",
  borderRadius: 7, padding: "10px 0", fontSize: 14, fontWeight: 700,
  color: "#000", letterSpacing: 1,
};

export default function AuthScreen() {
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  // "email" | "register" | "sent"
  const [step, setStep]     = useState<"email" | "register" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleEmailContinue() {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setLoading(true);
    setError("");
    const exists = await checkEmailExists(e);
    setLoading(false);
    if (exists) {
      await sendOtp(e);
    } else {
      setStep("register");
    }
  }

  async function handleRegister() {
    const e = email.trim().toLowerCase();
    const n = name.trim();
    if (!n) { setError("Please enter your display name."); return; }
    setLoading(true);
    setError("");
    const result = await registerPlayer(n, e);
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }
    await sendOtp(e);
  }

  async function sendOtp(e: string) {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ email: e });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep("sent");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: THEME.bgPage, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', Arial, sans-serif" }}>
      <div style={{ background: THEME.bgCard, border: `1px solid ${THEME.borderCard}`, borderRadius: 12, padding: "32px 28px", maxWidth: 360, width: "100%", margin: "0 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: THEME.textPrimary, marginBottom: 4 }}>FIFA WC 2026</div>
        <div style={{ fontSize: 11, color: THEME.textMuted, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 28 }}>Prediction Tracker</div>

        {step === "sent" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📬</div>
            <div style={{ fontSize: 15, color: THEME.textPrimary, fontWeight: 700, marginBottom: 8 }}>Check your inbox</div>
            <div style={{ fontSize: 13, color: THEME.textMuted, fontFamily: "'Barlow', Arial", lineHeight: 1.5 }}>
              We sent a magic link to <strong style={{ color: THEME.textPrimary }}>{email}</strong>. Click it to sign in.
            </div>
            <button onClick={() => { setStep("email"); setEmail(""); setName(""); }}
              style={{ marginTop: 20, background: "none", border: "none", color: THEME.textMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
              Use a different email
            </button>
          </div>
        )}

        {step === "email" && (
          <>
            <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 16, fontFamily: "'Barlow', Arial" }}>
              Enter your email to sign in or register.
            </div>
            <input type="email" value={email} autoFocus placeholder="your@email.com"
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmailContinue()}
              style={inputStyle}
            />
            {error && <div style={{ fontSize: 12, color: THEME.red, marginBottom: 10, fontFamily: "'Barlow', Arial" }}>{error}</div>}
            <button onClick={handleEmailContinue} disabled={loading || !email.trim()}
              style={{ ...btnStyle, cursor: loading || !email.trim() ? "default" : "pointer", opacity: loading || !email.trim() ? 0.6 : 1 }}>
              {loading ? "Checking…" : "Continue"}
            </button>
          </>
        )}

        {step === "register" && (
          <>
            <div style={{ fontSize: 13, color: THEME.textSecondary, marginBottom: 4, fontFamily: "'Barlow', Arial" }}>
              New here! Choose your display name.
            </div>
            <div style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 14, fontFamily: "'Barlow', Arial" }}>
              Your registration will be sent to the admin for approval.
            </div>
            <input type="text" value={name} autoFocus placeholder="Display name"
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
              style={inputStyle}
            />
            {error && <div style={{ fontSize: 12, color: THEME.red, marginBottom: 10, fontFamily: "'Barlow', Arial" }}>{error}</div>}
            <button onClick={handleRegister} disabled={loading || !name.trim()}
              style={{ ...btnStyle, cursor: loading || !name.trim() ? "default" : "pointer", opacity: loading || !name.trim() ? 0.6 : 1 }}>
              {loading ? "Registering…" : "Register & send link"}
            </button>
            <button onClick={() => { setStep("email"); setError(""); }}
              style={{ marginTop: 10, background: "none", border: "none", color: THEME.textMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline", display: "block", width: "100%", textAlign: "center" }}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
