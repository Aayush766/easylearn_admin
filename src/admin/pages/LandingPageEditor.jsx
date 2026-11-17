import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Save, Trash2, Video } from "lucide-react";
import { apiClient } from "../services/api";
import { uploadAdminImage, uploadAdminVideo } from "../services/upload";

const textFields = [
  ["organization", "Organization name"],
  ["brandFirst", "Brand first part"],
  ["brandSecond", "Brand second part"],
  ["primaryColor", "Primary brand color", "color"],
  ["heroTitle", "Hero title"],
  ["heroAccent", "Hero accent"],
  ["heroDescription", "Hero description", "textarea"],
  ["supportEmail", "Support email", "email"],
  ["phone", "Phone"],
  ["address", "Address", "textarea"],
];

const collectionFields = {
  courses: [["title", "Course title"], ["description", "Description", "textarea"], ["image", "Image URL", "image"], ["url", "Course link", "url"]],
  videos: [["title", "Video title"], ["description", "Description", "textarea"], ["url", "Video URL", "video"], ["thumbnail", "Thumbnail URL", "image"]],
  testimonials: [["name", "Name"], ["role", "Role"], ["quote", "Testimonial", "textarea"], ["image", "Photo URL", "image"]],
};

const sectionTypes = ["hero", "content", "cards", "media", "testimonials", "contact"];

function newSection(type = "content") {
  return { type, title: "", description: "", image: "", mediaUrl: "", buttonLabel: "", buttonUrl: "" };
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
  const urls = [value.logo, ...(value.sections || []).flatMap(section => [section?.image, section?.mediaUrl]), ...(value.courses || []).map(item => item?.image), ...(value.videos || []).flatMap(item => [item?.url, item?.thumbnail]), ...(value.testimonials || []).map(item => item?.image)].map(urlValue).filter(Boolean);
  if (urls.some(url => typeof url !== "string" || !/^https:\/\//i.test(url))) return "Media links must use secure HTTPS URLs.";
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
  const [status, setStatus] = useState("PUBLISHED");

  const sections = Array.isArray(content.sections) ? content.sections.map(objectValue) : [];
  const courses = Array.isArray(content.courses) ? content.courses : [];
  const videos = Array.isArray(content.videos) ? content.videos : [];
  const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];
  const logo = urlValue(content.logo);
  const previewTitle = [content.heroTitle, content.heroAccent].filter(Boolean).join(" ");

  useEffect(() => {
    let active = true;
    apiClient.get("/api/landing/manage").then(response => {
      if (!active) return;
      const data = objectValue(response.data?.data);
      const value = objectValue(data.draftContent);
      setContent({ ...value, logo: typeof value.logo === "string" ? { url: value.logo } : value.logo, primaryColor: value.primaryColor || "#1769FF" });
      setStatus(data.status || "PUBLISHED");
      setLoadError("");
    }).catch(requestError => { if (active) setLoadError(requestError.message || "Could not load the published landing content."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const previewSections = sections.filter(section => section && typeof section === "object");

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
    if (typeof payload.logo === "string") payload = { ...payload, logo: { url: payload.logo } };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await apiClient.put("/api/landing", { content: payload, action });
      const saved = objectValue(response.data?.data?.content || payload);
      setContent(saved);
      setStatus(response.data?.data?.status || (action === "publish" ? "PUBLISHED" : "DRAFT"));
      if (advanced) setJsonDraft(JSON.stringify(saved, null, 2));
      if (action === "publish") window.dispatchEvent(new Event("landing-content-updated"));
      setNotice(action === "publish" ? "Landing page content published." : "Draft saved. Visitors still see the last published version.");
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
      <div className="landing-save-actions"><span className={`landing-status-chip ${status.toLowerCase()}`}>{status === "PUBLISHED" ? "Published" : "Draft changes"}</span><button className="secondary" disabled={saving || Boolean(uploading) || Boolean(loadError)} onClick={() => save("save-draft")}><Save size={16}/>Save draft</button><button className="primary" disabled={saving || Boolean(uploading) || Boolean(loadError)} onClick={() => save("publish")}><Save size={16}/>{saving ? "Publishing…" : "Publish"}</button></div>
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
              {renderMediaField({ label: "Logo", value: logo, targetKey: "logo", onChange: value => updateRoot("logo", { ...objectValue(content.logo), url: value }) })}
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
                {renderMediaField({ label: "Section image", value: section.image, targetKey: `section-${index}-image`, onChange: value => updateSection(index, { image: value }) })}
                {section.type === "media" && renderMediaField({ label: "Video or media URL", value: section.mediaUrl, targetKey: `section-${index}-media`, resourceType: "video", onChange: value => updateSection(index, { mediaUrl: value }) })}
                <label className="field">Button label<input value={section.buttonLabel || ""} onChange={event => updateSection(index, { buttonLabel: event.target.value })} /></label>
                <label className="field">Button link<input type="url" value={section.buttonUrl || ""} onChange={event => updateSection(index, { buttonUrl: event.target.value })} placeholder="https://..." /></label>
              </div>
            </article>) : <div className="empty"><p>No sections yet. Add one to start building the page.</p></div>}
          </section>
          {Object.keys(collectionFields).map(renderCollection)}
        </> : <section className="panel landing-editor-panel"><h2>Advanced content JSON</h2><p>Edit any additional content keys supported by your public website. The editor checks that this is a valid JSON object before publishing.</p><textarea className="landing-json-editor" rows={32} spellCheck="false" value={jsonDraft} onChange={event => setJsonDraft(event.target.value)} /></section>}
        <button type="button" className="secondary" onClick={toggleAdvanced}>{advanced ? "Back to visual editor" : "Advanced JSON editor"}</button>
      </div>

      <aside className="panel landing-preview-panel">
        <div className="landing-preview-top"><span>Preview</span><small>Draft content</small></div>
        {logo && <img className="landing-preview-logo" src={logo} alt="Organization logo" />}
        <small>{content.organization || "Organization name"}</small>
        <h2>{previewTitle || "Landing page headline"}</h2>
        <p>{content.heroDescription || "Your hero description will appear here."}</p>
        <div className="landing-preview-contact"><b>Contact</b><span>{content.supportEmail || "Support email"}</span><span>{content.phone || "Phone"}</span><span>{content.address || "Address"}</span></div>
        {previewSections.map((section, index) => <article className="landing-preview-section" key={`preview-${index}`}>
          {section.image && <img src={section.image} alt="" />}
          <small>{section.type || "content"}</small>
          <h3>{section.title || "Section heading"}</h3>
          <p>{section.description || "Section description"}</p>
          {section.mediaUrl && <video src={section.mediaUrl} controls />}
        </article>)}
        {courses.length > 0 && <div className="landing-preview-list"><b>Courses ({courses.length})</b>{courses.slice(0, 3).map((item, index) => <span key={`preview-course-${index}`}>{item.title || "Untitled course"}</span>)}</div>}
        {videos.length > 0 && <div className="landing-preview-list"><b>Videos ({videos.length})</b>{videos.slice(0, 3).map((item, index) => <span key={`preview-video-${index}`}>{item.title || "Untitled video"}</span>)}</div>}
        {testimonials.length > 0 && <div className="landing-preview-list"><b>Testimonials ({testimonials.length})</b>{testimonials.slice(0, 3).map((item, index) => <span key={`preview-testimonial-${index}`}>{item.name || "Unnamed"}: {item.quote || ""}</span>)}</div>}
      </aside>
    </div>
  </section>;
}
