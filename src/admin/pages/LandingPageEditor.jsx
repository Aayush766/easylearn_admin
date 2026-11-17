import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Monitor, Plus, Save, Smartphone, Trash2, Video, X } from "lucide-react";
import { apiClient } from "../services/api";
import { uploadAdminImage, uploadAdminVideo } from "../services/upload";

const textFields = [
  ["organization", "Organization name"],
  ["brandFirst", "Brand first part"],
  ["brandSecond", "Brand second part"],
  ["heroTitle", "Hero title"],
  ["heroAccent", "Hero accent"],
  ["heroEyebrow", "Hero eyebrow"],
  ["heroDescription", "Hero description", "textarea"],
  ["heroButtonLabel", "Hero button label"],
  ["heroSecondaryButtonLabel", "Secondary hero button label"],
  ["coursesEyebrow", "Courses eyebrow"],
  ["supportEmail", "Support email", "email"],
  ["phone", "Phone"],
  ["address", "Address", "textarea"],
  ["headerLoginText", "Header login button label"],
  ["footerDescription", "Footer description", "textarea"],
  ["coursesTitle", "Courses section heading"],
  ["coursesDescription", "Courses section description", "textarea"],
  ["videosTitle", "Videos section heading"],
  ["videosDescription", "Videos section description", "textarea"],
  ["testimonialsTitle", "Testimonials section heading"],
  ["testimonialsDescription", "Testimonials section description", "textarea"],
];

const collectionFields = {
  courses: [["title", "Course title"], ["description", "Description", "textarea"], ["image", "Image URL", "image"], ["url", "Course link", "url"]],
  videos: [["title", "Video title"], ["description", "Description", "textarea"], ["url", "Video URL", "video"], ["thumbnail", "Thumbnail URL", "image"]],
  testimonials: [["name", "Name"], ["role", "Role"], ["quote", "Testimonial", "textarea"], ["image", "Photo URL", "image"]],
};

const sectionTypes = ["hero", "content", "cards", "media", "testimonials", "contact"];

function newSection(type = "content") {
  return { type, navLabel: "", eyebrow: "", title: "", description: "", image: "", video: "", ctaText: "", ctaHref: "", items: [] };
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function urlValue(value) {
  return typeof value === "string" ? value : value?.url || "";
}

function validateContent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Landing content must be a JSON object.";
  for (const key of ["sections", "courses", "videos", "testimonials"]) {
    if (value[key] !== undefined && !Array.isArray(value[key])) return `${key} must be an array.`;
  }
  const urls = [value.logo, value.heroImage, value.heroButtonUrl, value.heroSecondaryButtonUrl, ...(value.sections || []).flatMap(section => [section?.image, section?.video, section?.videoPoster, section?.ctaHref, ...(section?.items || []).flatMap(item => [item?.image, item?.video, item?.videoPoster, item?.ctaHref])]), ...(value.courses || []).flatMap(item => [item?.image, item?.url]), ...(value.videos || []).flatMap(item => [item?.url, item?.thumbnail]), ...(value.testimonials || []).map(item => item?.image)].map(urlValue).filter(Boolean);
  if (urls.some(url => typeof url !== "string" || !/^(https:\/\/|\/|#)/i.test(url))) return "Use secure HTTPS media links or a site-relative path or anchor.";
  return "";
}

export default function LandingPageEditor() {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("{}");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [previewSource, setPreviewSource] = useState("draft");
  const [frameReady, setFrameReady] = useState(false);
  const previewFrame = useRef(null);
  const previewKey = useRef(crypto.randomUUID());

  const sections = Array.isArray(content.sections) ? content.sections.map(objectValue) : [];
  const courses = Array.isArray(content.courses) ? content.courses : [];
  const videos = Array.isArray(content.videos) ? content.videos : [];
  const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];
  const logo = urlValue(content.logo);

  useEffect(() => {
    let active = true;
    apiClient.get("/api/landing/manage").then(response => {
      if (!active) return;
      const value = objectValue(response.data?.data?.draftContent || response.data?.data?.content);
      if (typeof value.logo === "string") value.logo = { url: value.logo };
      if (Array.isArray(value.sections)) value.sections = value.sections.map(section => {
        const entry = objectValue(section);
        return {
          ...entry,
          video: entry.video || entry.mediaUrl || "",
          ctaText: entry.ctaText || entry.buttonLabel || "",
          ctaHref: entry.ctaHref || entry.buttonUrl || "",
          items: Array.isArray(entry.items) ? entry.items : [],
        };
      });
      setContent(value);
      setLoadError("");
    }).catch(requestError => { if (active) setLoadError(requestError.message || "Could not load the published landing content."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const previewSections = sections.filter(section => section && typeof section === "object");
  const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";
  let previewUrl = "";
  try {
    const url = new URL(publicSiteUrl);
    url.searchParams.set("pelPreview", "1");
    url.searchParams.set("previewKey", previewKey.current);
    url.searchParams.set("parentOrigin", window.location.origin);
    previewUrl = url.toString();
  } catch { /* An invalid optional site URL leaves the preview unavailable. */ }

  useEffect(() => {
    if (!previewOpen || !previewUrl) return undefined;
    const targetOrigin = new URL(previewUrl).origin;
    const frameWindow = previewFrame.current?.contentWindow;
    if (!frameWindow) return undefined;
    const onPreviewReady = event => {
      if (event.source !== frameWindow || event.origin !== targetOrigin || event.data?.type !== "PEL_LANDING_PREVIEW_READY" || event.data?.key !== previewKey.current) return;
      setFrameReady(true);
    };
    window.addEventListener("message", onPreviewReady);
    if (!frameReady) return () => window.removeEventListener("message", onPreviewReady);
    const message = { key: previewKey.current };
    if (previewSource === "draft") {
      const draft = { ...content, logo: typeof content.logo === "string" ? { url: content.logo } : content.logo };
      frameWindow.postMessage({ ...message, type: "PEL_LANDING_PREVIEW_DRAFT", content: draft }, targetOrigin);
    } else if (previewSource === "default") {
      frameWindow.postMessage({ ...message, type: "PEL_LANDING_PREVIEW_DEFAULT" }, targetOrigin);
    } else {
      frameWindow.postMessage({ ...message, type: "PEL_LANDING_PREVIEW_PUBLISHED" }, targetOrigin);
    }
    return () => window.removeEventListener("message", onPreviewReady);
  }, [content, frameReady, previewOpen, previewSource, previewUrl]);

  function updateRoot(key, value) {
    setContent(current => ({ ...current, [key]: value }));
    setError("");
    setNotice("");
  }

  function updateSection(index, patch) {
    setContent(current => ({ ...current, sections: (Array.isArray(current.sections) ? current.sections : []).map((section, position) => position === index ? { ...section, ...patch } : section) }));
    setError("");
    setNotice("");
  }

  function updateSectionItem(sectionIndex, itemIndex, patch) {
    updateSection(sectionIndex, { items: (sections[sectionIndex]?.items || []).map((item, position) => position === itemIndex ? { ...item, ...patch } : item) });
  }

  function updateItem(collection, index, patch) {
    setContent(current => ({ ...current, [collection]: (Array.isArray(current[collection]) ? current[collection] : []).map((item, position) => position === index ? { ...item, ...patch } : item) }));
    setError("");
    setNotice("");
  }

  async function upload(file, resourceType, onComplete, targetKey) {
    if (!file) return;
    const isVideo = resourceType === "video";
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`Choose a ${isVideo ? "video" : "image"} under ${isVideo ? "100 MB" : "10 MB"}.`);
      return;
    }
    if (isVideo ? !file.type.startsWith("video/") : !file.type.startsWith("image/")) {
      setError(`Choose a valid ${isVideo ? "video" : "image"} file.`);
      return;
    }
    setUploading(targetKey);
    setError("");
    setNotice("");
    try {
      const uploaded = isVideo ? await uploadAdminVideo(file) : await uploadAdminImage(file);
      onComplete(uploaded.url);
      setNotice("Media uploaded. Save and publish to apply it to the landing page.");
    } catch (uploadError) {
      setError(uploadError.message || "Media upload failed.");
    } finally {
      setUploading("");
    }
  }

  function toggleAdvanced() {
    if (advanced) {
      try {
        const parsed = JSON.parse(jsonDraft);
        const validation = validateContent(parsed);
        if (validation) { setError(validation); return; }
        setContent(parsed);
        setAdvanced(false);
        setError("");
      } catch (parseError) {
        setError(`Invalid JSON: ${parseError.message}`);
      }
      return;
    }
    setJsonDraft(JSON.stringify(content, null, 2));
    setAdvanced(true);
    setError("");
  }

  async function save(action = "publish") {
    let payload = content;
    if (advanced) {
      try { payload = JSON.parse(jsonDraft); }
      catch (parseError) { setError(`Invalid JSON: ${parseError.message}`); return; }
    }
    const validation = validateContent(payload);
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await apiClient.put("/api/landing", { content: payload, action });
      const responseData = response.data?.data || {};
      const saved = objectValue(action === "save-draft" ? responseData.draftContent || payload : responseData.content || payload);
      setContent(saved);
      if (action === "publish") window.dispatchEvent(new CustomEvent("pel-branding-updated", { detail: saved }));
      if (advanced) setJsonDraft(JSON.stringify(saved, null, 2));
      setNotice(action === "save-draft" ? "Draft saved. The live landing page has not changed." : "Landing page content saved and published.");
    } catch (saveError) {
      setError(saveError.message || "Could not save landing page content.");
    } finally {
      setSaving(false);
    }
  }

  function renderMediaField({ label, value, targetKey, resourceType = "image", onChange }) {
    const isVideo = resourceType === "video";
    const mediaValue = urlValue(value);
    return <div className="landing-media-field" key={targetKey}>
      <label className="field">{label}<input type="url" value={mediaValue} onChange={event => onChange(event.target.value)} placeholder="https://..." /></label>
      <label className="landing-upload-button" aria-label={`Upload ${label.toLowerCase()}`}>
        {isVideo ? <Video size={16} /> : <ImagePlus size={16} />}
        {uploading === targetKey ? "Uploading…" : `Upload ${isVideo ? "video" : "image"}`}
        <input type="file" accept={isVideo ? "video/*" : "image/*"} disabled={Boolean(uploading)} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file, resourceType, onChange, targetKey); }} />
      </label>
      {mediaValue && (isVideo ? <video className="landing-media-preview" src={mediaValue} controls /> : <img className="landing-media-preview" src={mediaValue} alt={`${label} preview`} />)}
    </div>;
  }

  function renderCollection(key) {
    const fields = collectionFields[key];
    const items = Array.isArray(content[key]) ? content[key] : [];
    const title = key[0].toUpperCase() + key.slice(1);
    return <section className="panel landing-editor-panel" key={key}>
      <div className="landing-panel-heading"><div><h2>{title}</h2><p>Edit the {key} shown on the public site.</p></div><button type="button" className="secondary" onClick={() => updateRoot(key, [...items, {}])}><Plus size={15} /> Add {key.slice(0, -1)}</button></div>
      {items.length ? items.map((item, index) => <article className="landing-item" key={`${key}-${index}`}>
        <div className="landing-panel-heading"><b>{title.slice(0, -1)} {index + 1}</b><button type="button" className="icon-button danger" aria-label={`Remove ${key.slice(0, -1)} ${index + 1}`} onClick={() => updateRoot(key, items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>
        {fields.map(([field, label, type]) => type === "image" || type === "video"
          ? renderMediaField({ label, value: item[field], targetKey: `${key}-${index}-${field}`, resourceType: type, onChange: value => updateItem(key, index, { [field]: value }) })
          : <label className="field" key={field}>{label}{type === "textarea"
            ? <textarea rows={3} value={item[field] || ""} onChange={event => updateItem(key, index, { [field]: event.target.value })} />
            : <input type={type || "text"} value={item[field] || ""} onChange={event => updateItem(key, index, { [field]: event.target.value })} />}</label>)}
      </article>) : <div className="empty"><p>No {key} have been added yet.</p></div>}
    </section>;
  }

  if (loading) return <section className="page"><header className="page-head"><div><p>Prime Easy Learn · Platform</p><h1>Landing page editor</h1><span>Loading content from the server…</span></div></header></section>;

  return <section className="page">
    <header className="page-head">
      <div><p>Prime Easy Learn · Platform</p><h1>Landing page editor</h1><span>Edit and publish the public landing page content and media.</span></div>
      <div className="landing-editor-actions"><button className="secondary" disabled={saving || Boolean(uploading) || Boolean(loadError)} onClick={() => save("save-draft")}><Save size={15} /> {saving ? "Saving…" : "Save draft"}</button><button className="primary" disabled={saving || Boolean(uploading) || Boolean(loadError)} onClick={() => save("publish")}><Save size={16} /> {saving ? "Publishing…" : "Publish changes"}</button></div>
    </header>
    {loadError && <div className="login-error" role="alert">{loadError} <button type="button" className="text-button" onClick={() => window.location.reload()}>Reload editor</button></div>}
    {error && <p className="login-error" role="alert">{error}</p>}
    {notice && <p className="field-help" role="status">{notice}</p>}

    <div className="landing-editor-layout">
      <div className="landing-editor-main">
        {!advanced ? <>
          <section className="panel landing-editor-panel">
            <h2>Brand and hero</h2>
            <div className="landing-form-grid">
              {textFields.map(([key, label, type]) => <label className="field" key={key}>{label}{type === "textarea"
                ? <textarea rows={3} value={content[key] || ""} onChange={event => updateRoot(key, event.target.value)} />
                : <input type={type || "text"} value={content[key] || ""} onChange={event => updateRoot(key, event.target.value)} />}</label>)}
              <label className="field">Hero button link<input type="url" value={content.heroButtonUrl || ""} onChange={event => updateRoot("heroButtonUrl", event.target.value)} placeholder="https://..." /></label>
              <label className="field">Secondary hero button link<input type="url" value={content.heroSecondaryButtonUrl || ""} onChange={event => updateRoot("heroSecondaryButtonUrl", event.target.value)} placeholder="https://... or #section" /></label>
              {renderMediaField({ label: "Hero image", value: content.heroImage, targetKey: "hero-image", onChange: value => updateRoot("heroImage", value) })}
              <label className="field">Primary brand color<input type="color" value={/^#[0-9a-f]{6}$/i.test(content.primaryColor || "") ? content.primaryColor : "#1769FF"} onChange={event => updateRoot("primaryColor", event.target.value)} /></label>
              <label className="field">Accent color<input type="color" value={/^#[0-9a-f]{6}$/i.test(content.accentColor || "") ? content.accentColor : "#16A085"} onChange={event => updateRoot("accentColor", event.target.value)} /></label>
              <label className="field">Page background<input type="color" value={/^#[0-9a-f]{6}$/i.test(content.backgroundColor || "") ? content.backgroundColor : "#F8FAFF"} onChange={event => updateRoot("backgroundColor", event.target.value)} /></label>
              <label className="field">Page text color<input type="color" value={/^#[0-9a-f]{6}$/i.test(content.textColor || "") ? content.textColor : "#172033"} onChange={event => updateRoot("textColor", event.target.value)} /></label>
              {renderMediaField({ label: "Website logo", value: logo, targetKey: "logo", onChange: value => updateRoot("logo", { url: value }) })}
            </div>
          </section>

          <section className="panel landing-editor-panel">
            <div className="landing-panel-heading"><div><h2>Page sections</h2><p>Arrange the sections and edit their content.</p></div><label className="field landing-add-section">Add section<select value="" onChange={event => { if (event.target.value) updateRoot("sections", [...sections, newSection(event.target.value)]); }}><option value="">Choose a section…</option>{sectionTypes.map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label></div>
            {sections.length ? sections.map((section, index) => <article className="landing-item" key={`section-${index}`}>
              <div className="landing-panel-heading"><b>Section {index + 1}</b><div className="landing-row-actions"><button type="button" className="icon-button" aria-label="Move section up" disabled={index === 0} onClick={() => { const next = [...sections]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; updateRoot("sections", next); }}><ArrowUp size={16} /></button><button type="button" className="icon-button" aria-label="Move section down" disabled={index === sections.length - 1} onClick={() => { const next = [...sections]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; updateRoot("sections", next); }}><ArrowDown size={16} /></button><button type="button" className="icon-button danger" aria-label="Remove section" onClick={() => updateRoot("sections", sections.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div></div>
              <div className="landing-form-grid">
                <label className="field">Section type<select value={section.type || "content"} onChange={event => updateSection(index, { type: event.target.value })}>{sectionTypes.map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
                <label className="field">Heading<input value={section.title || ""} onChange={event => updateSection(index, { title: event.target.value })} /></label>
                <label className="field landing-span-2">Description<textarea rows={3} value={section.description || ""} onChange={event => updateSection(index, { description: event.target.value })} /></label>
                <label className="field">Navigation label<input value={section.navLabel || ""} onChange={event => updateSection(index, { navLabel: event.target.value })} /></label>
                <label className="field">Eyebrow<input value={section.eyebrow || ""} onChange={event => updateSection(index, { eyebrow: event.target.value })} /></label>
                {renderMediaField({ label: "Section image", value: section.image, targetKey: `section-${index}-image`, onChange: value => updateSection(index, { image: value }) })}
                {renderMediaField({ label: "Section video", value: section.video, targetKey: `section-${index}-video`, resourceType: "video", onChange: value => updateSection(index, { video: value }) })}
                <label className="field">Button label<input value={section.ctaText || ""} onChange={event => updateSection(index, { ctaText: event.target.value })} /></label>
                <label className="field">Button link<input type="url" value={section.ctaHref || ""} onChange={event => updateSection(index, { ctaHref: event.target.value })} placeholder="https://..." /></label>
                <label className="field">Section background<input type="color" value={/^#[0-9a-f]{6}$/i.test(section.backgroundColor || "") ? section.backgroundColor : "#ffffff"} onChange={event => updateSection(index, { backgroundColor: event.target.value })} /></label>
                <label className="field">Section text color<input type="color" value={/^#[0-9a-f]{6}$/i.test(section.textColor || "") ? section.textColor : "#172033"} onChange={event => updateSection(index, { textColor: event.target.value })} /></label>
              </div>
              <div className="landing-section-items">
                <div className="landing-panel-heading"><div><b>Cards and items</b><p>Optional content cards displayed inside this section.</p></div><button type="button" className="secondary" onClick={() => updateSection(index, { items: [...(section.items || []), {}] })}><Plus size={14} /> Add item</button></div>
                {(section.items || []).map((item, itemIndex) => <div className="landing-section-item" key={`section-${index}-item-${itemIndex}`}>
                  <div className="landing-panel-heading"><b>Item {itemIndex + 1}</b><button type="button" className="icon-button danger" aria-label={`Remove item ${itemIndex + 1}`} onClick={() => updateSection(index, { items: section.items.filter((_, position) => position !== itemIndex) })}><Trash2 size={15} /></button></div>
                  <div className="landing-form-grid">
                    {[["title", "Title"], ["name", "Name"], ["description", "Description"], ["text", "Text"], ["meta", "Detail"], ["price", "Price"], ["ctaText", "Button label"], ["ctaHref", "Button link", "url"]].map(([field, label, type]) => <label className="field" key={field}>{label}<input type={type || "text"} value={item[field] || ""} onChange={event => updateSectionItem(index, itemIndex, { [field]: event.target.value })} /></label>)}
                    {renderMediaField({ label: "Item image", value: item.image, targetKey: `section-${index}-item-${itemIndex}-image`, onChange: value => updateSectionItem(index, itemIndex, { image: value }) })}
                    {renderMediaField({ label: "Item video", value: item.video, targetKey: `section-${index}-item-${itemIndex}-video`, resourceType: "video", onChange: value => updateSectionItem(index, itemIndex, { video: value }) })}
                  </div>
                </div>)}
              </div>
            </article>) : <div className="empty"><p>No sections yet. Add one to start building the page.</p></div>}
          </section>
          {Object.keys(collectionFields).map(renderCollection)}
        </> : <section className="panel landing-editor-panel"><h2>Advanced content JSON</h2><p>Edit any additional content keys supported by your public website. The editor checks that this is a valid JSON object before publishing.</p><textarea className="landing-json-editor" rows={32} spellCheck="false" value={jsonDraft} onChange={event => setJsonDraft(event.target.value)} /></section>}
        <button type="button" className="secondary" onClick={toggleAdvanced}>{advanced ? "Back to visual editor" : "Advanced JSON editor"}</button>
      </div>

      <aside className="panel landing-preview-panel">
        <div className="landing-preview-top"><span>Website preview</span><button type="button" className="secondary" onClick={() => { setPreviewSource("draft"); setFrameReady(false); setPreviewOpen(true); }}><Eye size={15} /> Preview actual page</button></div>
        <p className="landing-preview-help">Preview uses the same landing page component as the learner website. Switch between your draft, the original default page, and the published version.</p>
        <div className="landing-preview-choices"><button type="button" onClick={() => { setPreviewSource("draft"); setFrameReady(false); setPreviewOpen(true); }}>Preview draft</button><button type="button" onClick={() => { setPreviewSource("default"); setFrameReady(false); setPreviewOpen(true); }}>Show default page</button></div>
      </aside>
    </div>
    {previewOpen && <div className="landing-preview-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
      <section className="landing-preview-dialog" role="dialog" aria-modal="true" aria-label="Landing page draft preview">
        <header><div><b>Landing page preview</b><small>{previewSource === "draft" ? "Unsaved draft" : previewSource === "default" ? "Original default page" : "Published page"} · {previewMode === "desktop" ? "Desktop" : "Mobile"} view</small></div><div className="landing-preview-controls"><button type="button" aria-pressed={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")}><Monitor size={16} /> Desktop</button><button type="button" aria-pressed={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")}><Smartphone size={16} /> Mobile</button><button type="button" aria-pressed={previewSource === "draft"} onClick={() => setPreviewSource("draft")}>Draft</button><button type="button" aria-pressed={previewSource === "default"} onClick={() => setPreviewSource("default")}>Default</button><button type="button" aria-pressed={previewSource === "published"} onClick={() => setPreviewSource("published")}>Published</button><button type="button" aria-label="Close preview" onClick={() => { setPreviewOpen(false); setFrameReady(false); }}><X size={18} /></button></div></header>
        <div className={`landing-preview-canvas ${previewMode}`}>{previewUrl ? <iframe ref={previewFrame} title="Actual public landing page preview" src={previewUrl} /> : <p className="landing-preview-unavailable">Set VITE_PUBLIC_SITE_URL to the client site URL to preview the actual landing page.</p>}</div>
      </section>
    </div>}
  </section>;
}
