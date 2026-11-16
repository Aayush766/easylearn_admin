import { useState } from "react";
import { ArrowLeft, ArrowRight, Crown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { writeDemo } from "../services/localStore";
import { login as apiLogin } from "../services/auth";
import logo from "../../assets/logo.jpeg";

const roles = {
  admin: { label: "Admin", path: "/admin", Icon: ShieldCheck, description: "Manage courses, learners and academic operations." },
  "super-admin": { label: "Super Admin", path: "/super-admin", Icon: Crown, description: "Manage the platform, administrators and operations." },
};

export function LoginChooser() {
  return (
    <main className="login-page">
      <section className="login-wrap">
        <Link to="/" className="login-brand"><img src={logo} alt="Prime Easy Learn" /></Link>
        <p className="login-eyebrow">Secure workspace</p>
        <h1>Choose your sign in</h1>
        <p className="login-intro">Select your account type to continue to the right workspace.</p>
        <div className="login-options">
          {Object.entries(roles).map(([slug, role]) => {
            const Icon = role.Icon;
            return <Link to={`/login/${slug}`} className="login-option" key={slug}>
              <span className="login-option-icon"><Icon size={23} /></span>
              <span className="login-option-copy"><b>{role.label} Login</b><small>{role.description}</small></span>
              <ArrowRight size={19} />
            </Link>;
          })}
        </div>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  const { role: roleSlug } = useParams();
  const navigate = useNavigate();
  const role = roles[roleSlug];
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!role) return <LoginChooser />;
  const Icon = role.Icon;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const identifier = emailOrPhone.trim().toLowerCase();
      const accountRole = roleSlug === "super-admin" ? "SUPER_ADMIN" : "ADMIN";
      const sessionData = await apiLogin(identifier, password, accountRole, twoFactorChallenge ? { challengeToken: twoFactorChallenge, code: twoFactorCode } : null);
      if (sessionData?.requiresTwoFactor) {
        setTwoFactorChallenge(sessionData.challengeToken);
        setTwoFactorCode("");
        setError("");
        return;
      }
      const user = sessionData?.user;
      if (!user || user.role !== accountRole) throw new Error("This account does not have access to the selected workspace.");
      writeDemo("auth-session", { role: roleSlug, adminId: user._id, email: user.email, mustChangePassword: false });
      navigate(role.path, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page"><section className="login-card">
    <Link to="/" className="login-back"><ArrowLeft size={16} /> All login options</Link>
    <div className="login-heading-icon"><Icon size={25} /></div>
    <Link to="/" className="login-brand"><img src={logo} alt="Prime Easy Learn" /></Link>
    <h1>{role.label} Login</h1>
    <p className="login-intro">Sign in with your {role.label.toLowerCase()} account to continue.</p>
    <form onSubmit={submit}>
      <label className="login-field">Email<input autoComplete="username" required value={emailOrPhone} onChange={event => setEmailOrPhone(event.target.value)} placeholder="Enter email" readOnly={Boolean(twoFactorChallenge)} /></label>
      {twoFactorChallenge
        ? <label className="login-field">Authenticator code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={twoFactorCode} onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" /></label>
        : <label className="login-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" /></label>}
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-submit" type="submit" disabled={busy}><LockKeyhole size={17} />{busy ? "Checking…" : twoFactorChallenge ? "Verify authenticator code" : `Sign in as ${role.label}`}</button>
      {twoFactorChallenge && <button className="secondary" type="button" onClick={() => { setTwoFactorChallenge(""); setTwoFactorCode(""); setPassword(""); setError(""); }}>Use a different account</button>}
    </form>
  </section></main>;
}


























