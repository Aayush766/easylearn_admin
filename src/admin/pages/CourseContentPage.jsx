import { useEffect, useMemo, useState } from "react";
import { FileText, FileVideo, ExternalLink, RefreshCw, Trash2, Upload, X, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";
import { uploadAdminMedia } from "../services/upload";
import "./CourseContentPage.css";

const blankForm = { courseId: "", moduleId: "", title: "", description: "", accessLevel: "ENROLLED", downloadable: true, addToNotes: false, durationSeconds: "" };
const acceptedExtensions = new Set(["pdf", "ppt", "pptx", "doc", "docx", "epub", "txt", "md", "rtf", "xls", "xlsx", "csv", "zip", "png", "jpg", "jpeg", "gif", "webp", "mp4", "mov", "webm"]);
const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const idOf = (value) => value && typeof value === "object" ? value._id || value.id : value;
const titleOf = (value, fallback = "") => value && typeof value === "object" ? value.title || fallback : fallback;
const extensionOf = (file) => String(file?.name?.split(".").pop() || "").toLowerCase();
function contentTypeFor(file) {
  const extension = extensionOf(file);
  if (file.type?.startsWith("video/") || ["mp4", "mov", "webm"].includes(extension)) return "VIDEO";
  if (extension === "pdf") return "PDF";
  if (["ppt", "pptx"].includes(extension)) return "PPT";
  return "OTHER";
}
function displayTypeForFile(file) {
  const type = contentTypeFor(file);
  return type === "VIDEO" ? "Video" : type === "PDF" ? "PDF" : type === "PPT" ? "PowerPoint" : "Course file";
}
function titleFromFile(file) {
  return String(file.name || "Course material").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Course material";
}

async function listAll(endpoint, params = {}) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = unwrap(await apiClient.get(endpoint, { params: { ...params, page, limit: 100 } }));
    rows.push(...(data.items || data.courses || data.modules || data.content || []));
    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  } while (page <= totalPages);
  return rows;
}

function typeIcon(type) {
  return type === "VIDEO" ? FileVideo : FileText;
}

export default function CourseContentPage() {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [items, setItems] = useState([]);
  const [courseFilter, setCourseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([listAll("/api/courses"), listAll("/api/modules")])
      .then(([courseRows, moduleRows]) => {
        if (!active) return;
        setCourses(courseRows);
        setModules(moduleRows);
      })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not load courses and modules."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reloadItems = async () => {
    setError("");
    setLoading(true);
    try {
      setItems(await listAll("/api/content", courseFilter ? { courseId: courseFilter } : {}));
    } catch (requestError) {
      setError(requestError.message || "Could not load course content.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void reloadItems(); }, [courseFilter]);

  const availableModules = useMemo(() => modules.filter((module) => String(idOf(module.courseId)) === String(form.courseId)), [modules, form.courseId]);
  const visibleItems = useMemo(() => {
    const rows = courseFilter ? items.filter((item) => String(idOf(item.courseId)) === String(courseFilter)) : items;
    return [...rows].sort((a, b) => String(titleOf(a.courseId)).localeCompare(String(titleOf(b.courseId))) || String(titleOf(a.moduleId)).localeCompare(String(titleOf(b.moduleId))) || Number(a.order || 0) - Number(b.order || 0));
  }, [items, courseFilter]);

  const addFiles = (selected) => {
    setFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...selected.filter((file) => !seen.has(`${file.name}:${file.size}:${file.lastModified}`))];
    });
  };

  const createContent = async (event) => {
    event.preventDefault();
    if (!files.length) { setError("Choose one or more videos or course files to upload."); return; }
    setSaving(true); setError(""); setNotice(""); setUploadProgress({ current: 0, total: files.length });
    const failed = [];
    let saved = 0;
    const selectedFiles = [...files];
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      setUploadProgress({ current: index + 1, total: selectedFiles.length });
      try {
        const extension = extensionOf(file);
        if (!acceptedExtensions.has(extension)) throw new Error("Unsupported file format.");
        const type = contentTypeFor(file);
        const uploaded = await uploadAdminMedia(file, type === "VIDEO" ? "video" : "raw");
        const baseTitle = form.title.trim();
        const fileTitle = titleFromFile(file);
        const title = (selectedFiles.length > 1 && baseTitle ? `${baseTitle} - ${fileTitle}` : baseTitle || fileTitle).slice(0, 180);
        await apiClient.post("/api/content", {
          courseId: form.courseId,
          moduleId: form.moduleId,
          title,
          description: form.description.trim(),
          type,
          file: { provider: "CLOUDINARY", publicId: uploaded.publicId, url: uploaded.url },
          accessLevel: form.accessLevel,
          downloadable: Boolean(form.downloadable),
          addToNotes: Boolean(form.addToNotes),
          durationSeconds: type === "VIDEO" && form.durationSeconds ? Number(form.durationSeconds) : undefined,
          order: 0,
        });
        saved += 1;
      } catch (uploadError) {
        failed.push({ file, message: uploadError.message || "Upload failed." });
      }
    }
    if (saved) await reloadItems();
    setSaving(false); setUploadProgress({ current: 0, total: 0 });
    if (!failed.length) {
      setDialogOpen(false); setForm(blankForm); setFiles([]);
      setNotice(`${saved} ${saved === 1 ? "item was" : "items were"} uploaded as drafts to this module.`);
    } else {
      setFiles(failed.map((entry) => entry.file));
      setNotice(saved ? `${saved} item${saved === 1 ? " was" : "s were"} uploaded successfully.` : "No files were uploaded.");
      setError(failed.map((entry) => `${entry.file.name}: ${entry.message}`).join(" "));
    }
  };

  const deleteContent = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This removes it from the course for learners.`)) return;
    setBusyId(String(item._id || item.id)); setError(""); setNotice("");
    try {
      await apiClient.delete(`/api/content/${encodeURIComponent(item._id || item.id)}`);
      setNotice("Course content deleted.");
      await reloadItems();
    } catch (requestError) { setError(requestError.message || "Could not delete this content."); }
    finally { setBusyId(""); }
  };

  const publishContent = async (item) => {
    setBusyId(String(item._id || item.id)); setError(""); setNotice("");
    try {
      await apiClient.post(`/api/content/${encodeURIComponent(item._id || item.id)}/publish`, {});
      setNotice("Content published to learners.");
      await reloadItems();
    } catch (requestError) { setError(requestError.message || "Could not publish this content."); }
    finally { setBusyId(""); }
  };

  const openDialog = () => {
    setError(""); setNotice(""); setFiles([]);
    setForm({ ...blankForm, courseId: courseFilter || courses[0]?._id || courses[0]?.id || "" });
    setDialogOpen(true);
  };

  return <div className="course-content-page">
    <PageHeader title="Course content" desc="Upload, review, publish, and remove PDFs, videos, and other course materials." action="Upload content" onAction={openDialog} actionDisabled={!courses.length || loading} />
    <section className="course-content-panel">
      <div className="course-content-toolbar">
        <label>Filter by course<select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="">All courses</option>{courses.map((course) => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>
        <button type="button" className="course-content-refresh" disabled={loading} onClick={() => void reloadItems()}><RefreshCw size={15} /> Refresh</button>
      </div>
      {error && !dialogOpen && <p className="course-content-alert" role="alert">{error}</p>}
      {notice && <p className="course-content-notice" role="status"><CheckCircle2 size={16} />{notice}</p>}
      <div className="course-content-table-wrap"><table className="course-content-table"><thead><tr><th>Material</th><th>Course / module</th><th>Type</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="6" className="course-content-empty">Loading course content...</td></tr> : visibleItems.length ? visibleItems.map((item) => {
          const Icon = typeIcon(item.type);
          const courseTitle = titleOf(item.courseId, courses.find((course) => String(course._id || course.id) === String(idOf(item.courseId)))?.title || "Course");
          const moduleTitle = titleOf(item.moduleId, modules.find((module) => String(module._id || module.id) === String(idOf(item.moduleId)))?.title || "Module");
          const itemId = String(item._id || item.id);
          return <tr key={itemId}><td><span className="course-content-name"><i><Icon size={17} /></i><span><b>{item.title}</b><small>{item.description || item.file?.url || "No description"}</small></span></span></td><td>{courseTitle}<small className="course-content-subline">{moduleTitle}</small></td><td><span className={`course-content-type type-${String(item.type || "other").toLowerCase()}`}>{item.type || "OTHER"}</span></td><td>{item.accessLevel === "FREE" ? "Free preview" : "Enrolled learners"}</td><td><span className={`course-content-status status-${String(item.status || "draft").toLowerCase()}`}>{item.status || "DRAFT"}</span></td><td><div className="course-content-actions">{item.file?.url && <a href={item.file.url} target="_blank" rel="noreferrer" title="Open uploaded file" aria-label={`Open ${item.title}`}><ExternalLink size={16} /></a>}{item.status === "DRAFT" && <button type="button" disabled={busyId === itemId} onClick={() => void publishContent(item)} title="Publish to learners"><CheckCircle2 size={16} /></button>}<button type="button" className="delete" disabled={busyId === itemId} onClick={() => void deleteContent(item)} title="Delete content"><Trash2 size={16} /></button></div></td></tr>;
        }) : <tr><td colSpan="6" className="course-content-empty">No course materials found. Upload a PDF, video, or other file to get started.</td></tr>}</tbody>
      </table></div>
      <p className="course-content-help">You can add multiple PDFs, videos, and files to the same course module. New uploads are saved as drafts.</p>
    </section>

    {dialogOpen && <div className="course-content-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialogOpen(false); }}><form className="course-content-dialog" onSubmit={createContent}>
      <header><div><span>COURSE LIBRARY</span><h2>Upload course content</h2><p>Select multiple videos or documents to add to one course module.</p></div><button type="button" disabled={saving} aria-label="Close" onClick={() => setDialogOpen(false)}><X size={19} /></button></header>
      <label>Course<select required value={form.courseId} onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value, moduleId: "" }))}><option value="">Select a course</option>{courses.map((course) => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select></label>
      <label>Module<select required value={form.moduleId} onChange={(event) => setForm((current) => ({ ...current, moduleId: event.target.value }))} disabled={!form.courseId}><option value="">Select a module</option>{availableModules.map((module) => <option key={module._id || module.id} value={module._id || module.id}>{module.title}</option>)}</select>{form.courseId && !availableModules.length && <small>Create a module for this course first.</small>}</label>
      <label>Title prefix (optional)<input maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Added before each filename" /></label>
      <div className="course-content-fields"><label>Access<select value={form.accessLevel} onChange={(event) => setForm((current) => ({ ...current, accessLevel: event.target.value }))}><option value="ENROLLED">Enrolled learners</option><option value="FREE">Free preview</option></select></label><label>Video duration in seconds (optional)<input type="number" min="0" value={form.durationSeconds} onChange={(event) => setForm((current) => ({ ...current, durationSeconds: event.target.value }))} placeholder="Applied to selected videos" /></label></div>
      <label className="course-content-file"><span><Upload size={17} />{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose videos and course files"}</span><small>PDF, MP4, MOV, WebM, PPT, PPTX, DOC, DOCX, and supported files. File type is detected automatically.</small><input type="file" multiple accept=".pdf,.mp4,.mov,.webm,.ppt,.pptx,.doc,.docx,.epub,.txt,.md,.rtf,.xls,.xlsx,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp" disabled={saving} onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }} /></label>
      {files.length > 0 && <ul className="course-content-file-list">{files.map((file, index) => <li className="course-content-file-row" key={`${file.name}:${file.size}:${file.lastModified}`}><span><b>{file.name}</b><small>{displayTypeForFile(file)} - {(file.size / (1024 * 1024)).toFixed(1)} MB</small></span><button type="button" disabled={saving} aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={15} /></button></li>)}</ul>}
      <label>Description<textarea maxLength={5000} rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Shared description for selected materials (optional)" /></label>
      <div className="course-content-checks"><label><input type="checkbox" checked={form.downloadable} onChange={(event) => setForm((current) => ({ ...current, downloadable: event.target.checked }))} />Learners can download these files</label><label><input type="checkbox" checked={form.addToNotes} onChange={(event) => setForm((current) => ({ ...current, addToNotes: event.target.checked }))} />Include them in learner study notes</label></div>
      {saving && <p className="course-content-uploading" role="status">Uploading item {uploadProgress.current} of {uploadProgress.total}...</p>}
      {error && dialogOpen && <p className="course-content-alert" role="alert">{error}</p>}
      <footer><button type="button" className="secondary" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className="primary" disabled={saving || !availableModules.length || !files.length}>{saving ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : `Upload ${files.length || "files"} as drafts`}</button></footer>
    </form></div>}
  </div>;
}
