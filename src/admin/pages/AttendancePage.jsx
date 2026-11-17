import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardCheck, Download, LoaderCircle, Search, Users, XCircle } from "lucide-react";
import { PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";

function responseData(response) { return response?.data?.data || {}; }
function rowsFrom(data) { return data.items || data.courses || data.users || []; }
function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

async function fetchDirectory(endpoint, params = {}) {
  const result = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const data = responseData(await apiClient.get(endpoint, { params: { ...params, page, limit: 100 } }));
    result.push(...rowsFrom(data));
    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  }
  return result;
}

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [learners, setLearners] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchDirectory("/api/courses"),
      fetchDirectory("/api/users", { role: "LEARNER" }),
      fetchDirectory("/api/users", { role: "TRAINER" }),
    ]).then(([courseRows, learnerRows, trainerRows]) => {
      if (!active) return;
      setCourses(courseRows);
      setLearners(learnerRows);
      setTrainers(trainerRows);
    }).catch(reason => { if (active) setError(reason.message || "Could not load attendance filters."); });
    return () => { active = false; };
  }, []);

  useEffect(() => { setPage(1); }, [courseId, learnerId, trainerId, from, to]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = responseData(await apiClient.get("/api/attendance", { params: {
        page, limit: 25,
        courseId: courseId || undefined,
        learnerId: learnerId || undefined,
        trainerId: trainerId || undefined,
        from: from || undefined,
        to: to || undefined,
      } }));
      setRecords(data.items || []);
      setSummary(data.summary || {});
      setTotal(Number(data.total) || 0);
      setTotalPages(Math.max(1, Number(data.totalPages) || 1));
    } catch (reason) {
      setRecords([]);
      setError(reason.message || "Could not load student attendance.");
    } finally { setLoading(false); }
  }, [courseId, from, learnerId, page, to, trainerId]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const visible = records.filter(row => `${row.learnerId?.name || ""} ${row.learnerId?.email || ""} ${row.courseId?.title || ""} ${row.trainerId?.name || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  function exportCsv() {
    if (!visible.length) return;
    const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [["Date", "Session", "Student", "Email", "Course", "Assigned trainer", "Status", "Note"], ...visible.map(row => [displayDate(row.attendanceDate), row.sessionName || "Class", row.learnerId?.name, row.learnerId?.email, row.courseId?.title, row.trainerId?.name, row.status, row.note])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-attendance.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <section className="page attendance-admin-page">
    <div className="attendance-admin-heading"><PageHeader title="Student attendance" desc="Review attendance records with each student, course, and assigned trainer." /><button className="primary attendance-export" onClick={exportCsv} disabled={!visible.length}><Download size={16} />Export CSV</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="attendance-admin-summary">
      <article><ClipboardCheck /><b>{total}</b><span>Attendance entries</span></article>
      <article><CheckCircle2 /><b>{summary.PRESENT || 0}</b><span>Present</span></article>
      <article><XCircle /><b>{summary.ABSENT || 0}</b><span>Absent</span></article>
      <article><CalendarDays /><b>{summary.LATE || 0}</b><span>Late</span></article>
      <article><Users /><b>{summary.EXCUSED || 0}</b><span>Excused</span></article>
    </div>
    <section className="panel attendance-admin-panel">
      <div className="attendance-admin-filters">
        <label className="attendance-admin-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search visible students or courses" /></label>
        <select aria-label="Filter by course" value={courseId} onChange={event => setCourseId(event.target.value)}><option value="">All courses</option>{courses.map(course => <option key={course._id || course.id} value={course._id || course.id}>{course.title}</option>)}</select>
        <select aria-label="Filter by student" value={learnerId} onChange={event => setLearnerId(event.target.value)}><option value="">All students</option>{learners.map(learner => <option key={learner._id || learner.id} value={learner._id || learner.id}>{learner.name}</option>)}</select>
        <select aria-label="Filter by trainer" value={trainerId} onChange={event => setTrainerId(event.target.value)}><option value="">All trainers</option>{trainers.map(trainer => <option key={trainer._id || trainer.id} value={trainer._id || trainer.id}>{trainer.name}</option>)}</select>
        <label className="attendance-admin-date">From<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label className="attendance-admin-date">To<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      </div>
      {loading ? <div className="attendance-admin-empty"><LoaderCircle className="attendance-admin-spin" />Loading student attendance…</div>
        : visible.length ? <div className="table-wrap"><table><thead><tr><th>Date / session</th><th>Student</th><th>Course</th><th>Assigned trainer</th><th>Status</th><th>Note</th></tr></thead><tbody>{visible.map(row => <tr key={row._id}><td>{displayDate(row.attendanceDate)}<small>{row.sessionName || "Class"}</small></td><td><b>{row.learnerId?.name || "Student"}</b><small>{row.learnerId?.email}</small></td><td>{row.courseId?.title || "Course"}</td><td>{row.trainerId?.name || "Trainer"}<small>{row.trainerId?.email}</small></td><td><span className={`attendance-admin-status ${String(row.status || "").toLowerCase()}`}>{row.status}</span></td><td>{row.note || "—"}</td></tr>)}</tbody></table></div>
          : <div className="attendance-admin-empty"><ClipboardCheck size={28} /><b>No attendance records found</b><span>All records are shown by default. Adjust the filters if needed.</span></div>}
      <footer className="attendance-admin-pagination"><span>Showing {total ? (page - 1) * 25 + 1 : 0}–{Math.min(page * 25, total)} of {total}</span><div><button disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages || loading} onClick={() => setPage(current => current + 1)}>Next</button></div></footer>
    </section>
  </section>;
}
