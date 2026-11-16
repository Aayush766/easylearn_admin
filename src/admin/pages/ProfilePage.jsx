import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";
import { login, me } from "../services/auth";
import { uploadAdminImage } from "../services/upload";

const emptyProfile = { name: "", email: "", phone: "", profileImage: null };

export default function ProfilePage({ isSuperAdmin = false }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChallengeToken, setPasswordChallengeToken] = useState("");
  const [passwordAuthenticatorCode, setPasswordAuthenticatorCode] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  useEffect(() => {
    let active = true;
    me().then(({ user }) => {
      if (!active) return;
      setUserId(user?._id || user?.id || "");
      setProfile({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        profileImage: user?.profileImage || null,
      });
      setTwoFactorEnabled(Boolean(user?.twoFactorEnabled));
      setError("");
    }).catch(requestError => { if (active) setError(requestError.message || "Could not load your profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveProfile() {
    if (!userId) return setError("Your account could not be identified. Sign in again and retry.");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await apiClient.patch(`/api/users/${encodeURIComponent(userId)}`, {
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        profileImage: profile.profileImage,
      });
      const user = response.data?.data?.user;
      if (user) setProfile(current => ({ ...current, name: user.name || current.name, email: user.email || current.email, phone: user.phone || "", profileImage: user.profileImage || null }));
      setNotice("Profile saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function selectProfileImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!userId) { setError("Your account is still loading. Wait briefly and try again."); return; }
    if (!file.type.startsWith("image/")) { setError("Choose an image file for your profile picture."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Choose an image smaller than 2 MB."); return; }
    setUploading(true);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const profileImage = await uploadAdminImage(file);
      const response = await apiClient.patch(`/api/users/${encodeURIComponent(userId)}`, { profileImage });
      const savedImage = response.data?.data?.user?.profileImage || profileImage;
      setProfile(current => ({ ...current, profileImage: savedImage }));
      setNotice("Profile picture uploaded and saved to your account.");
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload the profile picture.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (newPassword.length < 8) return setError("Use at least 8 characters for your new password.");
    if (newPassword !== confirmPassword) return setError("The new passwords do not match.");
    setChangingPassword(true);
    setError("");
    setNotice("");
    try {
      const session = passwordChallengeToken
        ? await login(profile.email, "", isSuperAdmin ? "SUPER_ADMIN" : "ADMIN", { challengeToken: passwordChallengeToken, code: passwordAuthenticatorCode })
        : await login(profile.email, currentPassword, isSuperAdmin ? "SUPER_ADMIN" : "ADMIN");
      if (session?.requiresTwoFactor) {
        setPasswordChallengeToken(session.challengeToken);
        setNotice("Enter a current authenticator code to confirm your identity.");
        return;
      }
      if (session?.accessToken) window.__PEL_ACCESS_TOKEN__ = session.accessToken;
      await apiClient.patch(`/api/users/${encodeURIComponent(userId)}`, { password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordChallengeToken("");
      setPasswordAuthenticatorCode("");
      setPasswordOpen(false);
      setNotice("Password changed. Use the new password the next time you sign in.");
    } catch (requestError) {
      setError(requestError.message || "Could not change your password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function startTwoFactorSetup() {
    setTwoFactorBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiClient.post("/api/auth/2fa/setup");
      setTwoFactorSetup(response.data?.data || null);
      setTwoFactorCode("");
    } catch (requestError) {
      setError(requestError.message || "Could not start two-factor setup.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function enableTwoFactor(event) {
    event.preventDefault();
    setTwoFactorBusy(true);
    setError("");
    setNotice("");
    try {
      await apiClient.post("/api/auth/2fa/enable", { code: twoFactorCode });
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setNotice("Two-factor authentication is enabled for your account.");
    } catch (requestError) {
      setError(requestError.message || "Could not verify the authenticator code.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function disableTwoFactor(event) {
    event.preventDefault();
    setTwoFactorBusy(true);
    setError("");
    setNotice("");
    try {
      await apiClient.post("/api/auth/2fa/disable", { currentPassword: twoFactorPassword, code: twoFactorCode });
      setTwoFactorEnabled(false);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      setNotice("Two-factor authentication is disabled.");
    } catch (requestError) {
      setError(requestError.message || "Could not disable two-factor authentication.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  const roleLabel = isSuperAdmin ? "Super Admin" : "Admin";
  const avatarUrl = typeof profile.profileImage === "string" ? profile.profileImage : profile.profileImage?.url;

  return (
    <section className="page">
      <PageHeader title="Profile" desc="Manage your account details and security." action={saving ? "Saving…" : "Save changes"} onAction={saveProfile} actionDisabled={saving || uploading} />
      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p className="field-help" role="status">{notice}</p>}
      {loading ? <section className="panel"><p role="status">Loading your account…</p></section> : <div className="settings-grid">
        <section className="panel profile-card">
          <div className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : (profile.name || "").split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <label className="profile-picture-upload"><Upload size={15} /> {uploading ? "Uploading…" : "Update profile picture"}
            <input type="file" accept="image/*" aria-label="Upload profile picture" disabled={uploading || saving} onChange={selectProfileImage} />
          </label>
          <h2>{profile.name}</h2>
          <p>{roleLabel} · Prime Easy Learn</p>
          <div className="form grid2">
            <label>Full name<input value={profile.name} onChange={event => setProfile(current => ({ ...current, name: event.target.value }))} disabled={saving} required /></label>
            <label>Email<input type="email" value={profile.email} readOnly disabled aria-describedby="profile-email-help" /><small id="profile-email-help" className="field-help">Email is managed by your account administrator.</small></label>
            <label>Phone<input value={profile.phone} onChange={event => setProfile(current => ({ ...current, phone: event.target.value }))} disabled={saving} /></label>
            <label>Role<input disabled value={roleLabel} /></label>
          </div>
        </section>

        <section className="panel">
          <h2>Security</h2>
          <div className="two-factor-settings">
            <div><b>Two-factor authentication</b><small>{twoFactorEnabled ? "Enabled. Sign-ins require a current code from your authenticator app." : "Add a time-based authenticator app to protect your account."}</small></div>
            {twoFactorEnabled
              ? <form className="password-change-form" onSubmit={disableTwoFactor}>
                  <label className="field">Current password<input type="password" autoComplete="current-password" value={twoFactorPassword} onChange={event => setTwoFactorPassword(event.target.value)} required /></label>
                  <label className="field">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFactorCode} onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
                  <button className="secondary" type="submit" disabled={twoFactorBusy}>{twoFactorBusy ? "Updating…" : "Disable two-factor authentication"}</button>
                </form>
              : twoFactorSetup
                ? <form className="password-change-form" onSubmit={enableTwoFactor}>
                    <p>Add this account to your authenticator app using the setup key:</p>
                    <code className="totp-secret">{twoFactorSetup.secret}</code>
                    <label className="field">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFactorCode} onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
                    <button className="primary" type="submit" disabled={twoFactorBusy}>{twoFactorBusy ? "Verifying…" : "Verify and enable"}</button>
                    <button className="secondary" type="button" onClick={() => { setTwoFactorSetup(null); setTwoFactorCode(""); }}>Cancel setup</button>
                  </form>
                : <button className="secondary" type="button" onClick={startTwoFactorSetup} disabled={twoFactorBusy}>{twoFactorBusy ? "Preparing…" : "Set up authenticator"}</button>}
          </div>
          <button className="secondary" type="button" onClick={() => { setPasswordOpen(value => !value); setPasswordChallengeToken(""); setPasswordAuthenticatorCode(""); setError(""); setNotice(""); }}>Change password</button>
          {passwordOpen && <form className="password-change-form" onSubmit={changePassword}>
            <label className="field">Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
            <label className="field">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} required /></label>
            <label className="field">Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={8} required /></label>
            {passwordChallengeToken && <label className="field">Authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={passwordAuthenticatorCode} onChange={event => setPasswordAuthenticatorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>}
            <button className="primary" type="submit" disabled={changingPassword}>{changingPassword ? "Updating…" : "Update password"}</button>
          </form>}
        </section>
      </div>}
    </section>
  );
}
