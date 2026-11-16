import { useEffect, useState } from "react";
import { apiClient } from "../services/api";

const defaults = { organization: "Prime Easy Learn Training Institute", brandFirst: "Prime", brandSecond: "Easy Learn", primaryColor: "#1769FF", supportEmail: "" };
function contentFrom(response) { return response?.data?.data?.content || {}; }

export default function BrandingPage() {
  const [content, setContent] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiClient.get("/api/landing")
      .then(response => { if (active) setContent(current => ({ ...current, ...contentFrom(response) })); })
      .catch(loadError => { if (active) setError(loadError.message || "Could not load the current brand settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key, value) => { setContent(current => ({ ...current, [key]: value })); setError(""); setNotice(""); };
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await apiClient.put("/api/landing", content);
      setContent(current => ({ ...current, ...contentFrom(response) }));
      setNotice("Brand identity saved and published.");
    } catch (saveError) { setError(saveError.message || "Could not save brand identity."); }
    finally { setSaving(false); }
  };

  return <div className="settings-grid">
    <form className="panel form" onSubmit={save}>
      <h2>Brand identity</h2>
      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>Organization name<input required maxLength={120} value={content.organization || ""} onChange={event => update("organization", event.target.value)} disabled={loading || saving} /></label>
      <label>Brand first part<input maxLength={60} value={content.brandFirst || ""} onChange={event => update("brandFirst", event.target.value)} disabled={loading || saving} /></label>
      <label>Brand second part<input maxLength={60} value={content.brandSecond || ""} onChange={event => update("brandSecond", event.target.value)} disabled={loading || saving} /></label>
      <label>Primary color<input type="color" value={/^#[0-9a-f]{6}$/i.test(content.primaryColor || "") ? content.primaryColor : "#1769FF"} onChange={event => update("primaryColor", event.target.value)} disabled={loading || saving} /></label>
      <label>Support email<input type="email" value={content.supportEmail || ""} onChange={event => update("supportEmail", event.target.value)} disabled={loading || saving} /></label>
      <button type="submit" className="primary" disabled={loading || saving}>{saving ? "Saving…" : "Save branding"}</button>
    </form>
    <section className="panel preview" style={{ "--brand-preview": content.primaryColor || "#1769FF" }}>
      <p>Live preview</p><h2>{content.brandFirst || "Prime"} {content.brandSecond || "Easy Learn"}</h2><small>{content.organization || "Training Institute"}</small>
      <button className="primary" style={{ background: "var(--brand-preview)" }}>Explore courses</button>
      <p>{content.supportEmail || "Add a support email"}</p>
    </section>
  </div>;
}
