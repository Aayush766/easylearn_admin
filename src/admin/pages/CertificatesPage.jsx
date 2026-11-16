import { useEffect, useMemo, useState } from "react";
import { Award, Check, ChevronLeft, ChevronRight, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { apiClient } from "../services/api";
import { uploadCloudflareImage } from "../services/upload";
import "./CertificatesPage.css";

const freshDesign = { name: "", style: "CLASSIC", primaryColor: "#173f83", accentColor: "#c6a354", backgroundImageUrl: "", logoUrl: "", organizationName: "PRIME EASY LEARN", certificateTitle: "CERTIFICATE OF COMPLETION", subtitle: "THIS IS PROUDLY PRESENTED TO", bodyText: "for successfully completing the accredited program in", signatureText: "AUTHORIZED SIGNATURE", signatureImageUrl: "", borderStyle: "DOUBLE", active: true };
const starters = [
  { name: "Royal blue", style: "CLASSIC", primaryColor: "#173f83", accentColor: "#c6a354" },
  { name: "Emerald modern", style: "MODERN", primaryColor: "#08765b", accentColor: "#52b99a" },
  { name: "Burgundy heritage", style: "BOTANICAL", primaryColor: "#8e2942", accentColor: "#d1a65a" },
  { name: "Build from blank", style: "CUSTOM", primaryColor: "#34415c", accentColor: "#a8b3c4", borderStyle: "SOLID" },
];
const unwrap = response => response?.data?.data ?? response?.data ?? {};

async function fetchAllPages(endpoint) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const data = unwrap(await apiClient.get(endpoint, { params: { page, limit: 100 } }));
    rows.push(...(data.items || data.enrollments || []));
    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  }
  return rows;
}
function CertificatePreview({ design, learner = "Learner Name", course = "Course name" }) {
  const style = design.style?.toLowerCase() || "classic";
  return <div className={`certificate-preview-art certificate-preview-${style}`} style={{ "--cert-main": design.primaryColor || freshDesign.primaryColor, "--cert-gold": design.accentColor || freshDesign.accentColor, backgroundImage: design.backgroundImageUrl ? `linear-gradient(#fffdf2d9,#fffdf2d9),url("${design.backgroundImageUrl}")` : undefined }}>
    <div className="preview-corner preview-corner-top"/><div className="preview-corner preview-corner-bottom"/>
    <div className="preview-brand">{design.logoUrl ? <img src={design.logoUrl} alt="Organization logo"/> : <Award size={16}/>}<span>{design.organizationName || "PRIME EASY LEARN"}</span></div>
    <small>{design.certificateTitle || "CERTIFICATE OF COMPLETION"}</small>
    <p className="preview-subtitle">{design.subtitle || "THIS IS PROUDLY PRESENTED TO"}</p>
    <strong>{learner}</strong><p className="preview-copy">{design.bodyText || "for successfully completing the accredited program in"}</p>
    <b>{course}</b><div className="preview-sign">{design.signatureImageUrl ? <img src={design.signatureImageUrl} alt="Authorized signature"/> : <span/>}<small>{design.signatureText || "AUTHORIZED SIGNATURE"}</small></div>
  </div>;
}

export default function CertificatesPage() {
  const [templates, setTemplates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [design, setDesign] = useState(freshDesign);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [templateError, setTemplateError] = useState("");

  const reload = async () => {
    setTemplateError("");
    try {
      const [templateResponse, enrollmentRows] = await Promise.all([
        apiClient.get("/api/admin/certificate-templates"),
        fetchAllPages("/api/enrollments"),
      ]);
      const templateData = unwrap(templateResponse);
      setTemplates(templateData.items || templateData.templates || []);
      setEnrollments(enrollmentRows);
    } catch (loadError) {
      setTemplateError(loadError.message || "Unable to load certificate templates and enrollment details.");
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const eligibleEnrollments = enrollments.filter(item => ["ACTIVE", "COMPLETED"].includes(String(item.status || "").toUpperCase()) && (item.courseId?._id || item.courseId) && (item.learnerId?._id || item.learnerId));
  const courseOptions = [...new Map(eligibleEnrollments.map(item => {
    const course = item.courseId && typeof item.courseId === "object" ? item.courseId : { _id: item.courseId, title: item.course || "Course" };
    return [String(course._id || course.id), course];
  })).values()].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  const courseEnrollments = eligibleEnrollments.filter(item => String(item.courseId?._id || item.courseId) === selectedCourseId);
  const learnerOptions = [...new Map(courseEnrollments.map(item => {
    const learner = item.learnerId && typeof item.learnerId === "object" ? item.learnerId : { _id: item.learnerId, name: item.learner || "Learner" };
    return [String(learner._id || learner.id), learner];
  })).values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  const learnerEnrollments = courseEnrollments.filter(item => String(item.learnerId?._id || item.learnerId) === selectedLearnerId);
  const enrollment = learnerEnrollments.find(item => String(item._id || item.id) === enrollmentId);
  const selectedCourse = courseOptions.find(item => String(item._id || item.id) === selectedCourseId);
  const selectedLearner = learnerOptions.find(item => String(item._id || item.id) === selectedLearnerId);
  const learnerName = selectedLearner?.name || enrollment?.learnerId?.name || enrollment?.learner || "Learner Name";
  const courseName = selectedCourse?.title || enrollment?.courseId?.title || enrollment?.course || "Course name";
  const activeTemplates = useMemo(() => templates.filter(item => item.active !== false), [templates]);
  const change = (key, value) => setDesign(current => ({ ...current, [key]: value }));
  async function uploadCertificateImage(field, file) {
    if (!file) return;
    setUploadingImage(field); setError(""); setNotice("");
    try {
      const image = await uploadCloudflareImage(file);
      change(field, image.url);
      setNotice(field === "logoUrl" ? "Certificate logo uploaded to Cloudflare Images." : field === "signatureImageUrl" ? "Authorized signature uploaded to Cloudflare Images." : "Certificate background uploaded to Cloudflare Images.");
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload this image to Cloudflare.");
    } finally { setUploadingImage(""); }
  }

  function openWizard(template = null, templateId = "") {
    setDesign({ ...freshDesign, ...(template || {}), name: template ? `${template.name || "Certificate"} copy` : "" });
    setSelectedTemplateId("");
    setEnrollmentId(""); setSelectedCourseId(""); setSelectedLearnerId(""); setStep(1); setWizard(true); setError(""); setNotice("");
  }
  function chooseDesign(template) { setDesign({ ...freshDesign, ...template, name: template.name === "Build from blank" ? "Custom certificate" : `${template.name || "Certificate"} copy` }); setSelectedTemplateId(""); setStep(2); }
  function editTemplate(item) { setDesign({ ...freshDesign, ...item }); setSelectedTemplateId(item._id); setEnrollmentId(""); setSelectedCourseId(""); setSelectedLearnerId(""); setStep(3); setWizard(true); setError(""); setNotice(""); }

  async function saveAndIssue() {
    if (!enrollmentId.trim() && !selectedTemplateId) { setError("Select or enter an enrollment before issuing the certificate."); setStep(2); return; }
    if (!design.name.trim()) { setError("Enter a name for this reusable certificate template."); setStep(3); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      // Save the final artwork as a reusable template, then issue this learner's certificate from it.
      const savedTemplate = unwrap(selectedTemplateId ? await apiClient.patch(`/api/admin/certificate-templates/${encodeURIComponent(selectedTemplateId)}`, design) : await apiClient.post("/api/admin/certificate-templates", design)).template;
      if (selectedTemplateId && !enrollmentId.trim()) { setWizard(false); setNotice("Certificate template updated successfully."); await reload(); return; }
      const issued = unwrap(await apiClient.post("/api/admin/certificates", { enrollmentId: enrollmentId.trim(), templateId: savedTemplate?._id }));
      const number = issued.certificate?.certificateNumber || issued.certificate?.certificate?.certificateNumber;
      setWizard(false); setNotice(number ? `Certificate ${number} issued successfully.` : "Template saved and certificate issued successfully.");
      await reload();
    } catch (saveError) {
      setError(saveError.message || "Could not save and issue the certificate.");
    } finally { setSaving(false); }
  }

  async function changeTemplateActive(item) {
    try { await apiClient.patch(`/api/admin/certificate-templates/${encodeURIComponent(item._id)}`, { active: item.active === false }); await reload(); }
    catch (e) { setTemplateError(e.message || "Could not update template."); }
  }
  async function removeTemplate(item) {
    if (!window.confirm(`Remove "${item.name}" from the available templates?`)) return;
    try { await apiClient.delete(`/api/admin/certificate-templates/${encodeURIComponent(item._id)}`); await reload(); }
    catch (e) { setTemplateError(e.message || "Could not remove template."); }
  }

  return <div className="cert-studio">
    <header className="cert-studio-heading"><div><span className="cert-eyebrow">CREDENTIAL DESIGNER</span><h1>Certificates</h1><p>Select a design, add the learner's details, customize the full artwork, then save and issue.</p></div><button className="cert-primary" onClick={() => openWizard()}><Plus size={17}/>Create certificate</button></header>
    {notice && <div className="cert-notice"><Check size={17}/>{notice}</div>}{templateError && <div className="cert-error" role="alert">{templateError}</div>}
    <section className="cert-gallery-panel"><div className="cert-section-heading"><div><h2>Saved templates</h2><p>Preview and reuse designs. Existing certificates keep their original design.</p></div><span>{templates.length} templates</span></div>
      {loading ? <div className="cert-empty">Loading certificate templates...</div> : templates.length ? <div className="cert-gallery">{templates.map(item => <article className="cert-template-card" key={item._id}><CertificatePreview design={item}/><div className="cert-template-card-body"><div><strong>{item.name}</strong><span className={item.active === false ? "cert-pill inactive" : "cert-pill"}>{item.active === false ? "Inactive" : "Active"}</span></div><small>{item.style || "CLASSIC"} layout  - {item.borderStyle || "DOUBLE"} border</small><div className="cert-template-actions"><button onClick={() => openWizard(item)}>Use design</button><button onClick={() => editTemplate(item)}>Edit design</button><button onClick={() => changeTemplateActive(item)}>{item.active === false ? "Activate" : "Deactivate"}</button><button className="danger-icon" onClick={() => removeTemplate(item)} aria-label={`Remove ${item.name}`}><Trash2 size={15}/></button></div></div></article>)}</div> : <div className="cert-empty"><Award size={28}/><h3>Your certificate gallery is ready</h3><p>Choose from the starter artwork or create your own custom template.</p><button className="cert-primary" onClick={() => openWizard()}><ImagePlus size={16}/> Browse designs</button></div>}
    </section>

    {wizard && <div className="cert-wizard-shade"><section className="cert-wizard" role="dialog" aria-modal="true" aria-labelledby="cert-wizard-title"><header><div><small>STEP {step} OF 3</small><h2 id="cert-wizard-title">{step === 1 ? "Select a template" : step === 2 ? "Certificate details" : "Customize your template"}</h2><p>{step === 1 ? "Choose a saved template, one of the starter designs, or create a custom certificate." : step === 2 ? "Select the learner enrollment and name this reusable template." : "Edit the complete design, text, colors, layout, border, logo, and background."}</p></div><button className="cert-close" onClick={() => setWizard(false)} aria-label="Close">×</button></header>
      {error && <div className="cert-error" role="alert">{error}</div>}
      {step === 1 && <div className="cert-choice-grid">{activeTemplates.map(item => <button type="button" key={item._id} onClick={() => chooseDesign(item)}><CertificatePreview design={item}/><strong>{item.name}</strong><small>Saved template</small></button>)}{starters.map(item => <button type="button" key={item.name} onClick={() => chooseDesign({ ...freshDesign, ...item })}><CertificatePreview design={{ ...freshDesign, ...item }}/><strong>{item.name}</strong><small>{item.style === "CUSTOM" ? "Fully customizable blank" : "Starter design  - customize before saving"}</small></button>)}</div>}
      {step === 2 && <div className="cert-detail-form"><label className="cert-select-field">Course *<select className="cert-select-control" value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedLearnerId(""); setEnrollmentId(""); }}><option value="">Select a course</option>{courseOptions.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title || course.name || "Course"}</option>)}</select><small>Courses with active or completed learner enrollments are listed.</small></label><label className="cert-select-field">Learner *<select className="cert-select-control" value={selectedLearnerId} disabled={!selectedCourseId} onChange={e => { setSelectedLearnerId(e.target.value); setEnrollmentId(""); }}><option value="">{selectedCourseId ? "Select a learner" : "Select a course first"}</option>{learnerOptions.map(learner => <option key={learner._id || learner.id} value={learner._id || learner.id}>{learner.name || learner.email || "Learner"}</option>)}</select></label><label className="cert-select-field">Enrollment *<select className="cert-select-control" value={enrollmentId} disabled={!selectedLearnerId} onChange={e => setEnrollmentId(e.target.value)}><option value="">{selectedLearnerId ? "Select an enrollment" : "Select a learner first"}</option>{learnerEnrollments.map(item => <option key={item._id || item.id} value={item._id || item.id}>{String(item.status || "ACTIVE").replaceAll("_", " ")}  - Expires {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "no date"}  - {String(item._id || item.id).slice(-8)}</option>)}</select></label><label className="cert-select-field">Template name *<input className="cert-select-control" value={design.name} onChange={e => change("name", e.target.value)} placeholder="e.g. Python course certificate"/></label><div className="cert-enrollment-summary"><b>Selected course</b><span>{courseName}</span><b>Certificate for</b><span>{learnerName}</span></div><p className="cert-detail-note">The course and learner are read from the enrollment. A certificate can be issued only after the learner meets course completion requirements.</p></div>}
      {step === 3 && <div className="cert-customizer"><div className="cert-live-preview"><span>LIVE PREVIEW</span><CertificatePreview design={design} learner={learnerName} course={courseName}/><p>Preview uses learner and course details from the selected enrollment.</p></div><div className="cert-design-fields"><label>Template name<input value={design.name} onChange={e => change("name", e.target.value)}/></label><label>Layout<select value={design.style} onChange={e => change("style", e.target.value)}><option value="CLASSIC">Classic  - framed</option><option value="MODERN">Modern  - geometric</option><option value="BOTANICAL">Heritage  - ornamental</option><option value="CUSTOM">Custom</option></select></label><div className="cert-color-fields"><label>Primary color<input type="color" value={design.primaryColor} onChange={e => change("primaryColor", e.target.value)}/></label><label>Accent color<input type="color" value={design.accentColor} onChange={e => change("accentColor", e.target.value)}/></label></div><label>Organization name<input value={design.organizationName} onChange={e => change("organizationName", e.target.value)}/></label><label>Certificate title<input value={design.certificateTitle} onChange={e => change("certificateTitle", e.target.value)}/></label><label>Recipient subtitle<input value={design.subtitle} onChange={e => change("subtitle", e.target.value)}/></label><label>Completion description<input value={design.bodyText} onChange={e => change("bodyText", e.target.value)}/></label><label>Signature label<input value={design.signatureText} onChange={e => change("signatureText", e.target.value)}/></label><label>Border style<select value={design.borderStyle} onChange={e => change("borderStyle", e.target.value)}><option value="DOUBLE">Double frame</option><option value="SOLID">Solid frame</option><option value="DASHED">Dashed frame</option><option value="NONE">No frame</option></select></label><label className="cert-image-upload">Certificate logo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={Boolean(uploadingImage)} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void uploadCertificateImage("logoUrl", file); }}/><small>{uploadingImage === "logoUrl" ? "Uploading to Cloudflare Images..." : design.logoUrl ? "Uploaded to Cloudflare. Choose a file to replace it." : "PNG, JPG, WEBP or GIF  - up to 10 MB"}</small>{design.logoUrl && <img src={design.logoUrl} alt="Uploaded certificate logo preview"/>}</label><label className="cert-image-upload">Certificate background<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={Boolean(uploadingImage)} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void uploadCertificateImage("backgroundImageUrl", file); }}/><small>{uploadingImage === "backgroundImageUrl" ? "Uploading to Cloudflare Images..." : design.backgroundImageUrl ? "Uploaded to Cloudflare. Choose a file to replace it." : "PNG, JPG, WEBP or GIF  - up to 10 MB"}</small>{design.backgroundImageUrl && <img src={design.backgroundImageUrl} alt="Uploaded certificate background preview"/>}</label><label className="cert-image-upload">Authorized signature image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={Boolean(uploadingImage)} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void uploadCertificateImage("signatureImageUrl", file); }}/><small>{uploadingImage === "signatureImageUrl" ? "Uploading to Cloudflare Images..." : design.signatureImageUrl ? "Uploaded to Cloudflare. Choose a file to replace it." : "Optional signature image - transparent PNG recommended"}</small>{design.signatureImageUrl && <img src={design.signatureImageUrl} alt="Uploaded authorized signature preview"/>}</label></div></div>}
      <footer><div className="cert-progress-dots"><i className={step >= 1 ? "on" : ""}/><i className={step >= 2 ? "on" : ""}/><i className={step >= 3 ? "on" : ""}/></div><div>{step > 1 && <button className="cert-secondary" onClick={() => { setStep(step - 1); setError(""); }}><ChevronLeft size={16}/>Back</button>}{step < 3 ? <button className="cert-primary" disabled={step === 2 && (!selectedCourseId || !selectedLearnerId || !enrollmentId || !design.name.trim())} onClick={() => { setStep(step + 1); setError(""); }}>Continue<ChevronRight size={16}/></button> : <button className="cert-primary" disabled={saving || Boolean(uploadingImage) || (!selectedTemplateId && !enrollmentId)} onClick={saveAndIssue}><Save size={16}/>{uploadingImage ? "Uploading image..." : saving ? "Saving and issuing..." : selectedTemplateId && !enrollmentId ? "Save template changes" : "Save template & issue"}</button>}</div></footer>
    </section></div>}
  </div>;
}




