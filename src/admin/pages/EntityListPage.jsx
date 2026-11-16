import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, CheckCircle2, Eye, MoreHorizontal, Pencil, Plus, Trash2, TrendingUp, Users } from "lucide-react";
import { config, labels } from "../data";
import { readEntity, writeEntity } from "../services/localStore";
import { deleteBackendRecord, fetchBackendRecords, hasBackendRecords, saveBackendRecord } from "../services/backendData";
import { Badge, CrudModal, EmptyState, PageHeader, StatCard, Toolbar } from "../components/Shared";

function labelFor(field, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.key === "percentage" && typeof value === "number") return `${value}%`;
  if (field.key === "amount" && typeof value === "number") return `₹${value.toLocaleString("en-IN")}`;
  return String(value);
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(record => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return {};
    return record;
  });
}

function applyCoursePosition(records, id, position) {
  const ordered = [...records].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const selectedIndex = ordered.findIndex(item => item.id === id);
  if (selectedIndex < 0) return ordered;
  const [selected] = ordered.splice(selectedIndex, 1);
  const targetIndex = Math.max(0, Math.min(ordered.length, Number(position || 1) - 1));
  ordered.splice(targetIndex, 0, selected);
  return ordered.map((item, index) => ({ ...item, order: index + 1 }));
}

function applyModulePosition(records, id, courseId, position, previousCourseId) {
  const updated = records.map(item => item.id === id ? { ...item, courseId } : item);
  const oldCourseModules = previousCourseId && previousCourseId !== courseId
    ? updated.filter(item => item.courseId === previousCourseId).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)) : [];
  const sequence = updated.filter(item => item.courseId === courseId && item.id !== id).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const selected = updated.find(item => item.id === id);
  if (!selected) return updated;
  sequence.splice(Math.max(0, Math.min(sequence.length, Number(position || 1) - 1)), 0, selected);
  const newOrder = new Map(sequence.map((item, index) => [item.id, index + 1]));
  const oldOrder = new Map(oldCourseModules.map((item, index) => [item.id, index + 1]));
  return updated.map(item => newOrder.has(item.id) ? { ...item, order: newOrder.get(item.id) } : oldOrder.has(item.id) ? { ...item, order: oldOrder.get(item.id) } : item);
}

function courseTrainerNames(courseValues) {
  const trainerIds = Array.isArray(courseValues.trainerIds) ? courseValues.trainerIds : [];
  const trainers = readEntity("trainers");
  return trainerIds.map(id => trainers.find(trainer => trainer.id === id)?.name).filter(Boolean);
}

function addTrainerToCourses(courseIds, trainer) {
  if (!trainer) return;
  const selected = new Set(courseIds);
  const trainers = readEntity("trainers");
  const courses = readEntity("courses").map(course => {
    if (!selected.has(course.id)) return course;
    const trainerIds = [...new Set([...(course.trainerIds || []), trainer.id])];
    const trainerNames = trainerIds.map(id => trainers.find(item => item.id === id)?.name).filter(Boolean);
    return { ...course, trainerIds, trainer: trainerNames.join(", ") };
  });
  writeEntity("courses", courses);
}

export default function EntityListPage({ page }) {
  const location = useLocation();
  const navigate = useNavigate();
  const schema = config[page] || config.courses;
  const [items, setItems] = useState(() => hasBackendRecords(page) ? [] : normalizeRecords(readEntity(page)));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [prefillValues, setPrefillValues] = useState(null);
  const [toast, setToast] = useState("");
  const [postCreateLearner, setPostCreateLearner] = useState(null);
  const [postImportLearners, setPostImportLearners] = useState(null);
  const [showBulkEnrollment, setShowBulkEnrollment] = useState(false);
  const [bulkCourseIds, setBulkCourseIds] = useState([]);
  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkValidity, setBulkValidity] = useState("365");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const notify = message => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => { let active = true; setQuery(""); setStatusFilter("ALL"); setCurrentPage(1); if (!hasBackendRecords(page)) { setItems(normalizeRecords(readEntity(page))); return undefined; } setLoading(true); fetchBackendRecords(page).then(records => { if (active) setItems(normalizeRecords(records)); }).catch(error => { if (active) notify(error.message || "Could not load records from the server."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [page]);
  useEffect(() => { writeEntity(page, items); }, [page, items]);
  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (page === "enrollments" && state.createEnrollmentFor) {
      const learner = state.createEnrollmentFor;
      const today = new Date().toISOString().slice(0, 10);
      setPrefillValues({ learnerId: learner.id, startDate: today, validityDays: 365, source: "NEW", status: learner.status === "BLOCKED" ? "SUSPENDED" : "ACTIVE" });
      setEditing(null); setViewing(false); setShow(true);
    } else if (state.searchTerm) {
      const term = state.searchTerm;
      setQuery(term); setStatusFilter("ALL"); setCurrentPage(1);
      setPrefillValues(null);
      if (state.searchId) {
        const match = readEntity(page).find(item => item.id === state.searchId);
        if (match) { setEditing(match); setViewing(true); setShow(true); }
      }
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.key, location.pathname, location.state, navigate, page]);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = items.filter(item => (!search || JSON.stringify(item).toLowerCase().includes(search)) && (statusFilter === "ALL" || String(item.status || "").toUpperCase() === statusFilter));
    return page === "modules" ? filtered.sort((a, b) => String(a.course || "").localeCompare(String(b.course || "")) || Number(a.order || 0) - Number(b.order || 0)) : filtered;
  }, [items, page, query, statusFilter]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreate = () => {
    setViewing(false);
    setEditing(null);
    setPrefillValues(null);
    setShow(true);
  };

  const openEdit = item => {
    if (schema.readOnly) return;
    setViewing(false);
    setEditing(item);
    setPrefillValues(null);
    setShow(true);
  };

  const handleSave = async values => {
    setSaving(true);
    try {
      if (hasBackendRecords(page)) { await saveBackendRecord(page, values, editing?.id); const records = await fetchBackendRecords(page); setItems(records); setShow(false); setEditing(null); setPrefillValues(null); notify("Changes saved to the server."); return; }
      let createdRecord = null;
      if (editing) {
        const editValues = { ...values };
        if (page === "admins") {
          if (!editValues.password?.trim()) delete editValues.password;
          else editValues.mustChangePassword = true;
        }
        setItems(current => {
          const course = ["modules", "trainer-assignment"].includes(page) ? readEntity("courses").find(item => item.id === editValues.courseId) : null;
          const category = page === "courses" ? readEntity("categories").find(item => item.id === editValues.categoryId) : null;
          const trainer = page === "trainer-assignment" ? readEntity("trainers").find(item => item.id === editValues.trainerId) : null;
          const assignedTrainerNames = page === "courses" ? courseTrainerNames(editValues) : [];
          const updated = current.map(item => item.id === editing.id ? { ...item, ...editValues, ...(course ? { course: course.title } : {}), ...(category ? { category: category.name } : {}), ...(page === "courses" ? { trainer: assignedTrainerNames.join(", ") } : {}), ...(trainer ? { trainer: trainer.name } : {}) } : item);
          if (page === "courses") return applyCoursePosition(updated, editing.id, editValues.order);
          if (page === "modules") return applyModulePosition(updated, editing.id, editValues.courseId, editValues.order, editing.courseId);
          return updated;
        });
        notify("Changes saved successfully.");
      } else if (["trainer-assignment", "enrollments"].includes(page)) {
        const courseIds = Array.isArray(values.courseId) ? values.courseId : [values.courseId].filter(Boolean);
        if (!courseIds.length) throw new Error("Select at least one course.");
        const sharedValues = Object.fromEntries(Object.entries(values).filter(([key]) => key !== "courseId"));
        const courses = readEntity("courses");
        const trainers = readEntity("trainers");
        const learners = readEntity("learners");
        const learner = learners.find(item => item.id === values.learnerId);
        const trainer = trainers.find(item => item.id === values.trainerId);
        const repeatedCourseIds = courseIds.filter(courseId => items.some(item => page === "trainer-assignment"
          ? item.trainerId === values.trainerId && item.courseId === courseId && item.status === "ACTIVE"
          : item.learnerId === values.learnerId && item.courseId === courseId && item.status === "ACTIVE"));
        if (repeatedCourseIds.length) {
          const repeatedTitles = courses.filter(course => repeatedCourseIds.includes(course.id)).map(course => course.title).join(", ");
          throw new Error(page === "enrollments" ? `This learner already has active enrollment in: ${repeatedTitles}.` : `This trainer is already assigned to: ${repeatedTitles}.`);
        }
        const start = values.startDate ? new Date(`${values.startDate}T00:00:00`) : null;
        const expiry = values.expiryDate ? new Date(`${values.expiryDate}T00:00:00`) : start ? new Date(start) : null;
        if (expiry && !values.expiryDate) expiry.setDate(expiry.getDate() + Math.max(1, Number(values.validityDays || 365)) - 1);
        const expiryDate = expiry?.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const records = courseIds.map((courseId, index) => {
          const course = courses.find(item => item.id === courseId);
          return {
            id: `${page === "enrollments" ? "ENR" : "ASN"}-${Date.now()}-${index}`,
            ...sharedValues,
            courseId,
            course: course?.title || "Course",
            ...(page === "enrollments" ? {
              learner: learner?.name || "Learner", trainer: course?.trainer || "", expiryDate,
              status: learner?.status === "BLOCKED" && values.status === "ACTIVE" ? "SUSPENDED" : values.status,
            } : { trainer: trainer?.name || "Trainer", learnerCount: 0 }),
          };
        });
        createdRecord = records[0];
        setItems(current => [...records, ...current]);
        setCurrentPage(1);
        if (page === "enrollments" && learner) {
          const activeCount = records.filter(record => record.status === "ACTIVE").length;
          writeEntity("learners", learners.map(item => item.id === learner.id ? {
            ...item, courses: Number(item.courses || 0) + records.length,
            activeEnrollments: Number(item.activeEnrollments || 0) + activeCount,
            expiry: expiryDate || item.expiry,
          } : item));
        }
        if (page === "trainer-assignment" && trainer) writeEntity("trainers", trainers.map(item => item.id === trainer.id ? { ...item, courses: Number(item.courses || 0) + records.length } : item));
        if (page === "trainer-assignment") addTrainerToCourses(courseIds, trainer);
        notify(`${records.length} ${page === "enrollments" ? "enrollment" : "trainer assignment"}${records.length === 1 ? "" : "s"} created.`);
      } else {
        const prefix = (labels[page] || "REC").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
        const nextId = `${prefix}-${Date.now().toString().slice(-6)}`;
        const course = page === "modules" ? readEntity("courses").find(item => item.id === values.courseId) : null;
        const category = page === "courses" ? readEntity("categories").find(item => item.id === values.categoryId) : null;
        const assignedTrainerNames = page === "courses" ? courseTrainerNames(values) : [];
        const createdItem = { id: nextId, ...values, ...(course ? { course: course.title } : {}), ...(category ? { category: category.name } : {}), ...(page === "courses" ? { trainer: assignedTrainerNames.join(", ") } : {}), ...(page === "learners" ? { role: "LEARNER" } : {}), ...(page === "admins" ? { mustChangePassword: true } : {}) };
        createdRecord = createdItem;
        setItems(current => {
          const records = [createdItem, ...current];
          if (page === "courses") return applyCoursePosition(records, nextId, values.order);
          if (page === "modules") return applyModulePosition(records, nextId, values.courseId, values.order);
          return records;
        });
        setCurrentPage(1);
        if (page === "learners") setPostCreateLearner(createdItem);
        notify(`${labels[page]} created successfully.`);
      }
      if (page === "enrollments" && editing) {
        const learners = readEntity("learners");
        const learner = learners.find(item => item.id === values.learnerId);
        const courses = readEntity("courses");
        const course = courses.find(item => item.id === values.courseId);
        const start = new Date(`${values.startDate}T00:00:00`);
        const expiry = values.expiryDate ? new Date(`${values.expiryDate}T00:00:00`) : new Date(start);
        if (!values.expiryDate) expiry.setDate(expiry.getDate() + Math.max(1, Number(values.validityDays || 365)) - 1);
        const validityDays = Math.max(1, Math.round((expiry - start) / 86400000) + 1);
        const derived = {
          learner: learner?.name || "Learner", course: course?.title || "Course", trainer: course?.trainer || "",
          expiryDate: expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), validityDays,
        };
        const enrollment = { ...(createdRecord || {}), ...values, ...derived };
        if (editing) setItems(current => current.map(item => item.id === editing.id ? { ...item, ...enrollment } : item));
        else setItems(current => current.map(item => item.id === enrollment.id ? enrollment : item));
      }
      setShow(false);
      setEditing(null);
      setPrefillValues(null);
    } catch (err) {
      notify(err.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async item => {
    if (schema.readOnly) return;
    if (!window.confirm(`Delete this ${labels[page].toLowerCase().replace(/s$/, "")}?`)) return;
    try {
      if (hasBackendRecords(page)) { await deleteBackendRecord(page, item); const records = await fetchBackendRecords(page); setItems(records); } else setItems(current => current.filter(row => row.id !== item.id));
      notify(hasBackendRecords(page) ? "Record deleted successfully." : "Record removed successfully.");
    } catch (err) {
      notify(err.message || "Unable to delete record.");
    }
  };

  const handleExport = () => {
    const rows = [schema.columns.map(column => column.label), ...filteredItems.map(item => schema.columns.map(column => labelFor(column, item[column.key])))];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prime-easy-learn-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("CSV exported successfully.");
  };

  const handleImport = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { notify("Please save the spreadsheet as CSV UTF-8 and upload it again."); return; }
    const imported = [];
    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) { notify("The sheet needs a header row and at least one learner row."); return; }
      const parse = line => line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)?.map(cell => cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"')) || [];
      const headerMap = new Map(schema.fields.flatMap(field => [[field.key.toLowerCase(), field.key], [field.label.toLowerCase(), field.key]]));
      const headers = parse(lines[0]).map(value => headerMap.get(value.trim().toLowerCase()) || value.trim());
      const required = schema.fields.filter(field => field.required || field.requiredOnCreate);
      const missingHeaders = required.filter(field => !headers.includes(field.key));
      if (missingHeaders.length) { notify(`Missing required columns: ${missingHeaders.map(field => field.label).join(", ")}. Download the template for the correct headings.`); return; }
      const records = lines.slice(1).map(line => Object.fromEntries(parse(line).map((value, index) => [headers[index], value.trim()]))).filter(row => Object.values(row).some(Boolean));
      if (!records.length) { notify("No learner rows found below the header."); return; }
      const issues = [];
      const emailSeen = new Set(items.map(item => String(item.email || "").trim().toLowerCase()));
      records.forEach((record, index) => {
        const rowNumber = index + 2;
        required.forEach(field => { if (!String(record[field.key] || "").trim()) issues.push(`Row ${rowNumber}: ${field.label} is required.`); });
        if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) issues.push(`Row ${rowNumber}: enter a valid email address.`);
        if (record.email) {
          const email = record.email.trim().toLowerCase();
          if (emailSeen.has(email)) issues.push(`Row ${rowNumber}: ${email} is duplicated or already exists.`);
          emailSeen.add(email);
        }
        record.status = String(record.status || "").trim().toUpperCase();
        if (record.status && !["ACTIVE", "BLOCKED"].includes(record.status)) issues.push(`Row ${rowNumber}: Status must be ACTIVE or BLOCKED.`);
      });
      if (issues.length) { notify(issues.slice(0, 3).join(" ") + (issues.length > 3 ? ` (+${issues.length - 3} more issues)` : "")); return; }
      const invalidPasswords = records.filter(record => typeof record.password !== "string" || record.password.length < 8);
      if (invalidPasswords.length) { notify("Each learner needs a temporary password of at least 8 characters."); return; }
      for (const record of records) {
        const result = await saveBackendRecord("learners", { ...record, role: "LEARNER" });
        imported.push(result?.user || result);
      }
      const createdLearners = imported.map(user => ({ ...user, id: user._id || user.id }));
      setItems(await fetchBackendRecords(page));
      setPostImportLearners(createdLearners);
      setCurrentPage(1);
      notify(`${createdLearners.length} learner${createdLearners.length === 1 ? "" : "s"} imported to the server from ${file.name}.`);
    } catch (importError) {
      try { setItems(await fetchBackendRecords(page)); } catch { /* preserve the import error */ }
      if (imported.length) {
        const createdLearners = imported.map(user => ({ ...user, id: user._id || user.id }));
        setPostImportLearners(createdLearners);
        notify(`${createdLearners.length} learner accounts were created before the import stopped: ${importError.message || "check the rejected row"}`);
      } else notify(importError.message || "The sheet could not be imported. Save it as CSV UTF-8 and try again.");
    }
  };

  const finishBulkEnrollment = async () => {
    const courses = readEntity("courses").filter(item => bulkCourseIds.includes(item.id));
    if (!courses.length) { notify("Add or select at least one course before creating enrollments."); return; }
    if (!bulkStartDate || Number(bulkValidity) < 1) { notify("Enter a start date and a validity of at least one day."); return; }
    const start = new Date(`${bulkStartDate}T00:00:00`);
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + Number(bulkValidity));
    try {
      const existing = await fetchBackendRecords("enrollments");
      const existingKeys = new Set(existing.map(item => `${item.learnerId}:${item.courseId}`));
      let createdCount = 0;
      for (const learner of postImportLearners) {
        for (const course of courses) {
          const learnerId = learner.id || learner._id;
          const courseId = course.id || course._id;
          const key = `${learnerId}:${courseId}`;
          if (existingKeys.has(key)) continue;
          await saveBackendRecord("enrollments", { learnerId, courseId, startDate: start.toISOString(), expiryDate: expiry.toISOString(), validityDays: Number(bulkValidity), source: "ADMIN" });
          existingKeys.add(key);
          createdCount += 1;
        }
      }
      const [updatedLearners] = await Promise.all([fetchBackendRecords("learners"), fetchBackendRecords("enrollments")]);
      setItems(updatedLearners);
      setPostImportLearners(null); setShowBulkEnrollment(false);
      notify(createdCount ? `${createdCount} course enrollment${createdCount === 1 ? "" : "s"} saved to the server.` : "No new enrollments were needed; existing course access was kept.");
    } catch (enrollmentError) {
      notify(enrollmentError.message || "Some enrollments could not be created. Refresh the list before retrying.");
    }
  };

  const EntityIcon = page === "courses" || page === "modules" ? BookOpen : Users;
  const total = items.length;
  const attention = page === "enrollments" ? items.filter(item => ["UPCOMING", "SUSPENDED"].includes(item.status)).length : items.filter(item => ["DRAFT", "BLOCKED", "PENDING", "REVOKED"].includes(item.status)).length;

  return (
    <section className="page">
      <PageHeader
        title={schema.title}
        desc={schema.desc}
        action={schema.action}
        onAction={openCreate}
      />

      <div className="kpis">
        <StatCard value={total} label={`Total ${schema.title.toLowerCase()}`} Icon={EntityIcon} />
        <StatCard value={loading ? "…" : Math.min(total, 18)} label="Recent records" Icon={TrendingUp} tone="green" />
        <StatCard value={attention} label="Needs attention" Icon={AlertTriangle} tone="orange" />
      </div>

      <section className="panel">
        <Toolbar
          query={query}
          setQuery={setQuery}
          onFilter={() => {
            const statuses = ["ALL", ...new Set(items.map(item => String(item.status || "").toUpperCase()).filter(Boolean))];
            const next = (statuses.indexOf(statusFilter) + 1) % statuses.length;
            setStatusFilter(statuses[next]); setCurrentPage(1);
          }}
          filterLabel={`Status: ${statusFilter === "ALL" ? "All" : statusFilter}`}
          onExport={handleExport}
          onImport={handleImport}
          canImport={!schema.readOnly && ["learners"].includes(page)}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {schema.columns.map(column => <th key={column.key}>{column.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`}><td colSpan={schema.columns.length + 1}><div className="skeleton-row" /></td></tr>
                ))
              ) : visibleItems.length ? visibleItems.map(item => (
                <tr key={item.id}>
                  {schema.columns.map(column => (
                    <td key={column.key}>
                      {column.badge ? <Badge>{labelFor(column, item[column.key])}</Badge> : labelFor(column, item[column.key])}
                    </td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button type="button" title="View" aria-label="View" onClick={() => { setEditing(item); setViewing(true); setShow(true); }}>
                        <Eye size={15} />
                      </button>
                      {!schema.readOnly && <button type="button" title="Edit" aria-label="Edit" onClick={() => openEdit(item)}><Pencil size={15} /></button>}
                      {!schema.readOnly && <button type="button" title="Delete" aria-label="Delete" onClick={() => handleDelete(item)}><Trash2 size={15} /></button>}
                      <button type="button" title="Quick status change" aria-label="Quick status change" onClick={() => {
                        if (schema.readOnly || !item.status) { notify("This record has no quick status action."); return; }
                        const statuses = page === "courses" ? ["DRAFT", "PUBLISHED", "ARCHIVED"] : page === "categories" || page === "modules" ? ["ACTIVE", "ARCHIVED"] : ["ACTIVE", "INACTIVE"];
                        const next = statuses[(statuses.indexOf(String(item.status).toUpperCase()) + 1 + statuses.length) % statuses.length];
                        setItems(current => current.map(row => row.id === item.id ? { ...row, status: next } : row));
                        notify(`Status changed to ${next}.`);
                      }}><MoreHorizontal size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={schema.columns.length + 1}><EmptyState title={`No ${schema.title.toLowerCase()} found`} /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Showing {filteredItems.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} filtered results</span>
          <div className="pagination-controls">
            <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <button type="button" key={pageNumber} className={currentPage === pageNumber ? "current" : ""} onClick={() => setCurrentPage(pageNumber)}>{pageNumber}</button>)}
            <button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}>›</button>
          </div>
        </div>
      </section>

      {show && (
        <CrudModal
          page={page}
          row={editing}
          prefill={prefillValues}
          viewOnly={viewing}
          onClose={() => { setShow(false); setEditing(null); setViewing(false); setPrefillValues(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {page === "learners" && postCreateLearner && <div className="backdrop" onMouseDown={() => setPostCreateLearner(null)}>
        <section className="modal learner-next-step" role="dialog" aria-modal="true" aria-labelledby="learner-created-title" onMouseDown={event => event.stopPropagation()}>
          <header><div><p className="import-eyebrow">Account created</p><h2 id="learner-created-title">{postCreateLearner.name} is ready</h2><p>The learner account is saved. You can now grant course access by creating an enrollment.</p></div><button type="button" aria-label="Close" onClick={() => setPostCreateLearner(null)}>×</button></header>
          <div className="learner-next-content"><div className="learner-next-step-icon"><BookOpen size={22} /></div><div><b>Next: enroll this learner</b><small>Choose one or more courses, a start date, and access duration. You can also do this later from Enrollments.</small></div></div>
          <footer><button type="button" className="secondary" onClick={() => setPostCreateLearner(null)}>Do this later</button><button type="button" className="primary" onClick={() => {
            const base = location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
            const learner = { id: postCreateLearner.id, name: postCreateLearner.name, email: postCreateLearner.email, status: postCreateLearner.status };
            setPostCreateLearner(null);
            navigate(`${base}/enrollments`, { state: { createEnrollmentFor: learner } });
          }}><Plus size={15} /> Create enrollment</button></footer>
        </section>
      </div>}

      {page === "learners" && postImportLearners && <div className="backdrop" onMouseDown={() => { setPostImportLearners(null); setShowBulkEnrollment(false); }}>
        {!showBulkEnrollment ? <section className="modal learner-next-step" role="dialog" aria-modal="true" aria-labelledby="bulk-created-title" onMouseDown={event => event.stopPropagation()}>
          <header><div><p className="import-eyebrow">Bulk import complete</p><h2 id="bulk-created-title">{postImportLearners.length} learner accounts added</h2><p>All uploaded rows passed validation. You can grant the imported learners access to a course now.</p></div><button type="button" aria-label="Close" onClick={() => setPostImportLearners(null)}>×</button></header>
          <div className="learner-next-content"><div className="learner-next-step-icon"><Users size={22} /></div><div><b>Enroll the imported learners together</b><small>Choose one or more courses; each learner will receive a separate enrollment for each selected course.</small></div></div>
          <footer><button type="button" className="secondary" onClick={() => setPostImportLearners(null)}>Finish later</button><button type="button" className="primary" onClick={() => { setBulkCourseIds(readEntity("courses")[0]?.id ? [readEntity("courses")[0].id] : []); setShowBulkEnrollment(true); }}><Plus size={15} /> Set up bulk enrollment</button></footer>
        </section> : <section className="modal learner-bulk-enrollment" role="dialog" aria-modal="true" aria-labelledby="bulk-enrollment-title" onMouseDown={event => event.stopPropagation()}>
          <header><div><p className="import-eyebrow">Next step · bulk enrollment</p><h2 id="bulk-enrollment-title">Grant course access</h2><p>This creates an enrollment for each of the {postImportLearners.length} imported learners.</p></div><button type="button" aria-label="Close" onClick={() => { setShowBulkEnrollment(false); setPostImportLearners(null); }}>×</button></header>
          <div className="bulk-enrollment-fields">
            <label className="field">Courses<select className="bulk-course-select" multiple value={bulkCourseIds} onChange={event => setBulkCourseIds(Array.from(event.target.selectedOptions, option => option.value))}>{readEntity("courses").map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select><small className="field-help">Choose one or more courses. Hold Ctrl (Windows) or Command (Mac) to select multiple.</small></label>
            <label className="field">Enrollment start date<input type="date" value={bulkStartDate} onChange={event => setBulkStartDate(event.target.value)} /></label>
            <label className="field">Access duration (days)<input type="number" min="1" value={bulkValidity} onChange={event => setBulkValidity(event.target.value)} /></label>
          </div>
          <div className="bulk-enrollment-summary"><Users size={17} /><span><b>{postImportLearners.length} learners · {bulkCourseIds.length} courses</b><small>{postImportLearners.length * bulkCourseIds.length} separate enrollment records will be created.</small></span></div>
          <footer><button type="button" className="secondary" onClick={() => { setShowBulkEnrollment(false); setPostImportLearners(null); }}>Cancel</button><button type="button" className="primary" onClick={finishBulkEnrollment}><CheckCircle2 size={15} /> Create {postImportLearners.length * bulkCourseIds.length} enrollments</button></footer>
        </section>}
      </div>}

      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span></div>}
    </section>
  );
}







