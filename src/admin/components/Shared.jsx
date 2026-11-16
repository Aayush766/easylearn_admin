import { useMemo, useRef, useState } from "react";
import {
  Search, SlidersHorizontal, Upload, Download, Plus, X, CheckCircle2,
  AlertCircle, Save, Loader2, GripVertical
} from "lucide-react";
import { config, labels, seed } from "../data";
import { readEntity, writeEntity } from "../services/localStore";
import { apiClient, USE_MOCK_API } from "../services/api";
import { makeSlug } from "../services/backendData";
import { uploadAdminImage } from "../services/upload";

export function Badge({ children }) {
  const value = String(children ?? "");
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <span className={`badge ${normalized}`}>{value || "—"}</span>;
}

export function PageHeader({ title, desc, action, onAction, actionDisabled = false, eyebrow = "Prime Easy Learn · Management" }) {
  return (
    <header className="page-head">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {desc && <span>{desc}</span>}
      </div>
      {action && (
        <button className="primary" onClick={onAction} disabled={actionDisabled}>
          <Plus size={17} /> {action}
        </button>
      )}
    </header>
  );
}

export function StatCard({ value, label, Icon, tone = "" }) {
  return (
    <article className="stat">
      <span className={tone}><Icon size={19} /></span>
      <div><b>{value}</b><small>{label}</small></div>
    </article>
  );
}

export function ActivityTable() {
  const rows = [
    ["Aarav Kumar", "Completed React assessment", "Full Stack Web Development", "12 min ago"],
    ["Priya Sharma", "Reached 75% progress", "UI/UX Design Masterclass", "38 min ago"],
    ["Rohan Mehta", "Enrollment extended", "Digital Marketing Pro", "1 hr ago"]
  ];
  return (
    <table>
      <thead><tr><th>Learner</th><th>Activity</th><th>Course</th><th>When</th></tr></thead>
      <tbody>
        {rows.map(row => (
          <tr key={`${row[0]}-${row[1]}`}>
            {row.map((cell, i) => (
              <td key={`${row[0]}-${i}`}>{i === 0
                ? <span className="person"><b>{cell.split(" ").map(v => v[0]).join("")}</b>{cell}</span>
                : cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Toolbar({ query, setQuery, onFilter, onExport, onImport, canImport = true, filterLabel = "Filters" }) {
  const file = useRef();
  const [showImportGuide, setShowImportGuide] = useState(false);
  const downloadLearnerTemplate = () => {
    const rows = [
      ["Full name", "Email", "Phone", "Temporary password", "Profile image URL", "Status"],
      ["Ananya Patel", "ananya@example.com", "+91 98765 43210", "ChangeMe123!", "https://example.com/ananya.jpg", "ACTIVE"],
    ];
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "prime-easy-learn-learner-import-template.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="filters">
      <label>
        <Search size={17} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />
      </label>
      {onFilter && <button type="button" onClick={onFilter}><SlidersHorizontal size={16} /> {filterLabel}</button>}
      {canImport && onImport && <>
        <button type="button" onClick={() => setShowImportGuide(true)}><Upload size={16} /> Import</button>
        <input ref={file} hidden type="file" accept=".csv,text/csv" onChange={onImport} />
        {showImportGuide && <div className="backdrop import-backdrop" onMouseDown={() => setShowImportGuide(false)}>
          <section className="modal import-guide" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="learner-import-title">
            <header><div><p className="import-eyebrow">Bulk learner setup</p><h2 id="learner-import-title">Prepare your learner sheet</h2><p>Use one learner per row, with the column headings in the first row.</p></div><button type="button" onClick={() => setShowImportGuide(false)} aria-label="Close"><X size={19} /></button></header>
            <div className="import-guide-content">
              <div className="import-columns"><div className="import-columns-head"><b>Column heading</b><b>Requirement and format</b></div>
                {[
                  ["Full name", "Required · learner’s name"],
                  ["Email", "Required · valid, unique email address"],
                  ["Phone", "Optional · include country code, e.g. +91"],
                  ["Temporary password", "Required · temporary sign-in password"],
                  ["Profile image URL", "Optional · direct image URL"],
                  ["Status", "Required · ACTIVE or BLOCKED"],
                ].map(([heading, detail]) => <div className="import-column-row" key={heading}><code>{heading}</code><span>{detail}</span></div>)}
              </div>
              <div className="import-note"><b>Sheet rules</b><span>Keep the headings unchanged, put each learner on a separate row, and remove blank rows. Download the template and open it in Excel or Google Sheets.</span></div>
              <div className="import-sample"><b>Example row</b><div>Ananya Patel <i>·</i> ananya@example.com <i>·</i> +91 98765 43210 <i>·</i> ChangeMe123! <i>·</i> optional image URL <i>·</i> ACTIVE</div></div>
            </div>
            <footer><button type="button" className="secondary" onClick={downloadLearnerTemplate}><Download size={15} /> Download template</button><button type="button" className="primary" onClick={() => { setShowImportGuide(false); file.current?.click(); }}><Upload size={15} /> Choose CSV file</button></footer>
            <small className="import-format-note">The current demo imports CSV files. In Excel, choose Save As → CSV UTF-8 before uploading.</small>
          </section>
        </div>}
      </>}
      {onExport && <button type="button" onClick={onExport}><Download size={16} /> Export</button>}
    </div>
  );
}

function getOptions(source) {
  return readEntity(source).map(item => ({
    value: item.id,
    label: source === "enrollments"
      ? `${item.learner || item.learnerId || "Learner"} · ${item.course || item.courseId || "Course"} · ends ${item.expiryDate || "—"}`
      : item.name || item.title || item.email || item.id,
  }));
}

function initialForm(schema, row, prefill = null) {
  const form = {};
  const courseCount = pageCourseCount();
  schema.fields.forEach(field => {
    let value = row?.[field.key];
    if (!row && field.createType === "multiselect") value = [];
    if (field.type === "courseOrder" && value === undefined) value = courseCount + 1;
    if (field.type === "moduleOrder" && value === undefined) value = 1;
    if (value === undefined) value = field.defaultValue ?? (field.type === "checkbox" ? false : "");
    if (field.type === "date" && value) value = dateInputValue(value);
    form[field.key] = value;
  });
  const result = { ...form, ...(prefill || {}) };
  if (result.startDate && result.expiryDate) result.validityDays = inclusiveDays(result.startDate, result.expiryDate);
  else if (result.startDate && result.validityDays) result.expiryDate = shiftedDate(result.startDate, Number(result.validityDays) - 1);
  return result;
}

function dateInputValue(value) {
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  const localized = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!localized) return "";
  const date = new Date(`${localized[2]} ${localized[1]}, ${localized[3]}`);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftedDate(dateValue, days) {
  if (!dateValue || !Number.isFinite(Number(days))) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days));
  return dateInputValue(date.toISOString().slice(0, 10));
}

function inclusiveDays(startValue, endValue) {
  if (!startValue || !endValue) return "";
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function pageCourseCount() {
  return readEntity("courses").length;
}

export function CrudModal({ page, row, prefill = null, onClose, onSave, saving = false, viewOnly = false }) {
  const schema = config[page];
  const [values, setValues] = useState(() => initialForm(schema, row, prefill));
  const [error, setError] = useState("");
  const [dropPosition, setDropPosition] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const update = (key, value) => setValues(current => ({ ...current, [key]: value }));

  const validate = () => {
    for (const field of schema.fields) {
      if (field.readOnly) continue;
      const value = values[field.key];
      const missing = field.required || (!row && field.requiredOnCreate);
      if (missing && (value === "" || value === null || value === undefined || (Array.isArray(value) && value.length === 0))) {
        return `${field.label} is required.`;
      }
    }
    if (page === "admins" && values.password && values.password.length < 6) {
      return "Temporary password must be at least 6 characters.";
    }
    if (page === "assessments" && Number(values.passingMarks) > Number(values.totalMarks)) {
      return "Passing marks cannot be greater than total marks.";
    }
    if (page === "assessments" && Number(values.attemptLimit) < 1) {
      return "Attempt limit must be at least 1.";
    }
    if (page === "enrollments" && Number(values.validityDays) < 1) {
      return "Validity must be at least 1 day.";
    }
    if (page === "courses" && (Array.isArray(values.certificateOptions) ? values.certificateOptions : []).some(option => !option.name?.trim() || !option.templateUrl?.trim())) {
      return "Complete both the name and template URL for each certificate option.";
    }
    return "";
  };

  const submit = async () => {
    const message = validate();
    if (message) { setError(message); return; }
    if (page === "courses" && values.categoryId === "__new_category__") {
      const name = newCategoryName.trim();
      if (!name) { setError("Enter a name for the new category."); return; }
      const categories = readEntity("categories");
      let category = categories.find(item => String(item.name || "").trim().toLowerCase() === name.toLowerCase());
      if (!category) {
        if (USE_MOCK_API) {
          category = { id: `CAT-${Date.now()}`, name, description: "", courseCount: 0, learnerCount: 0, status: "ACTIVE" };
        } else {
          try {
            const response = await apiClient.post("/api/categories", { name, slug: makeSlug(name), description: "", status: "ACTIVE" });
            const created = response.data?.data?.category;
            if (!created?._id) throw new Error("The server did not return the new category ID.");
            category = { ...created, id: created._id };
          } catch (requestError) {
            setError(requestError.message || "Could not create the category.");
            return;
          }
        }
        writeEntity("categories", [category, ...categories]);
      }
      const nextValues = { ...values, categoryId: category.id, category: category.name };
      setError("");
      await onSave(nextValues);
      return;
    }
    setError("");
    await onSave(values);
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <section className="modal large" onMouseDown={e => e.stopPropagation()}>
        <header>
          <div>
            <h2>{row ? "Edit" : "Add"} {labels[page]}</h2>
            <p>Complete the fields required by the LMS data model.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <div className="form grid2">
          {schema.fields.map(field => {
            const inputType = row ? field.editType || field.type : field.createType || field.type;
            const options = field.optionsFrom ? getOptions(field.optionsFrom) : (field.options || []).map(v => ({ value: v, label: v }));
            const value = values[field.key];
            const orderedCourses = field.type === "courseOrder"
              ? [...readEntity("courses")].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
              : [];
            const coursesToPlaceAmong = row ? orderedCourses.filter(course => course.id !== row.id) : orderedCourses;
            const common = {
              id: `${page}-${field.key}`,
              name: field.key,
              disabled: field.readOnly || saving || viewOnly,
              required: field.required && !field.readOnly,
            };

            return (
              <label className={`form-field ${["textarea", "certificateOptions"].includes(inputType) ? "span2" : ""}`} key={field.key} htmlFor={common.id}>
                <span>{field.label}{field.required && !field.readOnly ? " *" : ""}</span>

                {inputType === "certificateOptions" ? (
                  <div className="certificate-options-editor">
                    {(Array.isArray(value) ? value : []).map((option, index) => <div className="certificate-option-row" key={option.id || index}>
                      <div><span>Option name</span><input type="text" value={option.name || ""} disabled={common.disabled} placeholder="e.g. Merit certificate" onChange={event => update(field.key, (Array.isArray(value) ? value : []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></div>
                      <div><span>Template URL</span><input type="url" value={option.templateUrl || ""} disabled={common.disabled} placeholder="https://..." onChange={event => update(field.key, (Array.isArray(value) ? value : []).map((item, itemIndex) => itemIndex === index ? { ...item, templateUrl: event.target.value } : item))} /></div>
                      {!viewOnly && <button className="secondary certificate-option-remove" type="button" disabled={saving} onClick={() => update(field.key, value.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
                    </div>)}
                    {!viewOnly && <button className="secondary certificate-option-add" type="button" disabled={saving} onClick={() => update(field.key, [...(Array.isArray(value) ? value : []), { id: `CERT-OPT-${Date.now()}`, name: "", templateUrl: "" }])}><Plus size={15} /> Add certificate option</button>}
                    {!value?.length && <small className="field-help">No certificate templates added yet.</small>}
                  </div>
                ) : inputType === "certificateOption" ? (
                  (() => {
                    const course = readEntity("courses").find(item => String(item.id) === String(values.courseId));
                    const certificateOptions = Array.isArray(course?.certificateOptions) ? course.certificateOptions : [];
                    return <select {...common} value={value ?? ""} onChange={event => update(field.key, event.target.value)}>
                      <option value="">{values.courseId ? certificateOptions.length ? "Select certificate option (optional)" : "No options configured for this course" : "Select a course first"}</option>
                      {certificateOptions.map((option, index) => <option key={option.id || index} value={option.id || option.name}>{option.name || `Certificate option ${index + 1}`}</option>)}
                    </select>;
                  })()
                ) : inputType === "textarea" ? (
                  <textarea {...common} value={value ?? ""} onChange={e => update(field.key, e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} />
                ) : inputType === "image" ? (
                  <div className="thumbnail-picker">
                    <input {...common} type="file" accept="image/*" onChange={event => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const isProfileImage = field.key === "profileImage";
                      if (!file.type.startsWith("image/")) { setError(`Choose an image file for the ${isProfileImage ? "profile image" : "course thumbnail"}.`); return; }
                      if (file.size > 2 * 1024 * 1024) { setError("Choose an image smaller than 2 MB."); return; }
                      setUploadingImage(true); setError("");
                      uploadAdminImage(file).then(image => { update(field.key, image); }).catch(uploadError => setError(uploadError.message || "Image upload failed.")).finally(() => setUploadingImage(false));
                    }} />
                    <div className={`thumbnail-preview${value ? " has-image" : ""}`}>
                      {value ? <img src={typeof value === "string" ? value : value?.url} alt={field.key === "profileImage" ? "Profile image preview" : "Course thumbnail preview"} /> : <span><Upload size={21} /><b>{field.key === "profileImage" ? "Upload a profile image (optional)" : "Attach a course thumbnail"}</b><small>PNG, JPG or WebP · up to 2 MB</small></span>}
                    </div>
                    <label className="thumbnail-button" htmlFor={common.id}>{value ? "Replace image" : "Choose image"}</label>
                  </div>
                ) : inputType === "courseOrder" ? (
                  <div className="course-order-control">
                    <select {...common} value={value ?? orderedCourses.length + 1} onChange={e => update(field.key, Number(e.target.value))}>
                      {Array.from({ length: coursesToPlaceAmong.length + 1 }, (_, index) => index + 1).map(position => {
                        const targetCourse = coursesToPlaceAmong[position - 1];
                        return <option key={position} value={position}>{targetCourse ? `${position}. Before ${targetCourse.title || targetCourse.name}` : `${position}. At the end`}</option>;
                      })}
                    </select>
                    <div className="course-order-list" aria-label="Current course order">
                      {orderedCourses.length ? orderedCourses.map((course, index) => <div className={`course-order-item${row?.id === course.id ? " is-current" : ""}`} key={course.id}><span>{index + 1}</span><b>{course.title || course.name}</b>{row?.id === course.id && <em>Editing</em>}</div>) : <small>No courses yet. This will be the first course.</small>}
                    </div>
                  </div>
                ) : inputType === "moduleOrder" ? (
                  <div className="module-order-widget">
                    {!values.courseId ? <div className="module-order-empty"><span>1</span><small>Select a course above to see its module sequence.</small></div> : (() => {
                      const modules = readEntity("modules").filter(module => module.courseId === values.courseId && module.id !== row?.id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
                      const position = Math.max(1, Math.min(modules.length + 1, Number(value || 1)));
                      const handleDrop = targetPosition => event => { event.preventDefault(); update(field.key, targetPosition); setDropPosition(null); };
                      const placeholder = <div className="module-order-new" draggable={!viewOnly} onDragStart={event => { event.dataTransfer.setData("text/plain", "new-module"); event.dataTransfer.effectAllowed = "move"; }}><GripVertical size={16} /><span><b>{values.title?.trim() || (row ? row.title : "New module")}</b><small>{row ? "Module being edited" : "Module being added"}</small></span><em>{position}</em></div>;
                      return <>
                        <select {...common} value={position} onChange={event => update(field.key, Number(event.target.value))} aria-label="Choose module position">
                          {Array.from({ length: modules.length + 1 }, (_, index) => index + 1).map(slot => <option value={slot} key={slot}>{slot}. {modules[slot - 1] ? `Before ${modules[slot - 1].title}` : "At the end"}</option>)}
                        </select>
                        <div className="module-order-list" aria-label="Module order preview">
                          <div className="module-order-heading"><b>Course module order</b><small>Drag the highlighted module or choose a position above.</small></div>
                          {Array.from({ length: modules.length + 1 }, (_, index) => {
                            const slot = index + 1;
                            return <div key={`slot-${slot}`}>
                              <div className={`module-order-drop-slot${position === slot ? " is-active" : ""}${dropPosition === slot ? " is-over" : ""}`} onClick={() => !viewOnly && update(field.key, slot)} onDragOver={event => { event.preventDefault(); setDropPosition(slot); }} onDragLeave={() => setDropPosition(null)} onDrop={handleDrop(slot)} role="button" tabIndex={viewOnly ? -1 : 0} aria-label={`Place module at position ${slot}`} onKeyDown={event => { if (!viewOnly && (event.key === "Enter" || event.key === " ")) update(field.key, slot); }}>
                                {position === slot ? placeholder : <span>Drop here · position {slot}</span>}
                              </div>
                              {modules[index] && <div className="module-order-existing" onDragOver={event => { event.preventDefault(); setDropPosition(slot); }} onDragLeave={() => setDropPosition(null)} onDrop={handleDrop(slot)}><span>{index + 1}</span><b>{modules[index].title}</b></div>}
                            </div>;
                          })}
                        </div>
                      </>;
                    })()}
                  </div>
                ) : inputType === "select" ? (
                  <>
                  <select {...common} value={value ?? ""} onChange={e => {
                    const selectedValue = e.target.value;
                    update(field.key, selectedValue);
                    if (page === "modules" && field.key === "courseId") {
                      const count = readEntity("modules").filter(module => module.courseId === selectedValue && module.id !== row?.id).length;
                      update("order", count + 1);
                    }
                    if (page === "certificates" && field.key === "courseId") update("certificateOptionId", "");
                  }}>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    {page === "courses" && field.key === "categoryId" && !row && <option value="__new_category__">+ Add new category...</option>}
                  </select>
                  {page === "courses" && field.key === "categoryId" && !row && value === "__new_category__" && <input type="text" value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="Enter new category name" aria-label="New category name" disabled={saving || viewOnly} />}
                  </>
                ) : inputType === "multiselect" ? (
                  <select {...common} multiple aria-label={`${field.label}, select multiple options`} value={Array.isArray(value) ? value : []} onChange={e => update(field.key, Array.from(e.target.selectedOptions, option => option.value))}>
                    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : inputType === "checkbox" ? (
                  <span className="checkbox-field"><input {...common} type="checkbox" checked={Boolean(value)} onChange={e => update(field.key, e.target.checked)} /><em>Enabled</em></span>
                ) : (
                  <input
                    {...common}
                    type={inputType || "text"}
                    min={field.min}
                    value={value ?? ""}
                    onChange={e => {
                      const nextValue = e.target.value;
                      update(field.key, nextValue);
                      if (page === "enrollments" && field.key === "startDate") update("expiryDate", shiftedDate(nextValue, Number(values.validityDays || 1) - 1));
                      if (page === "enrollments" && field.key === "validityDays") update("expiryDate", shiftedDate(values.startDate, Number(nextValue || 0) - 1));
                      if (page === "enrollments" && field.key === "expiryDate") update("validityDays", inclusiveDays(values.startDate, nextValue));
                    }}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                )}
                {inputType === "multiselect" && <small className="field-help">Select one or more. Hold Ctrl (Windows) or Command (Mac) to choose multiple.</small>}
                {field.helper && <small className="field-help">{field.helper}</small>}
              </label>
            );
          })}
        </div>

        {error && <div className="form-error"><AlertCircle size={16} /> {error}</div>}

        <footer>
          <button type="button" className="secondary" onClick={onClose} disabled={saving || uploadingImage}>Cancel</button>
          {!viewOnly && <button type="button" className="primary" onClick={submit} disabled={saving || uploadingImage}>
            {uploadingImage ? <><Loader2 size={16} className="spin" /> Uploading image...</> : saving ? <><Loader2 size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save {labels[page]}</>}
          </button>}
        </footer>
      </section>
    </div>
  );
}

export function EmptyState({ title = "No records found", text = "Try changing your filters or add a new record." }) {
  return <div className="empty"><Search size={30} /><h2>{title}</h2><p>{text}</p></div>;
}

export function useEntityOptions() {
  return useMemo(() => seed, []);
}






