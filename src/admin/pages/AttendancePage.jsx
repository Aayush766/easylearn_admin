import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ClipboardCheck, Download, LoaderCircle, Search, Users } from "lucide-react";
import { apiClient } from "../services/api";
import "./attendance.css";

const dataOf = response => response?.data?.data ?? response?.data ?? {};
const localDate = date => { const value = new Date(date); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 10); };
const today = localDate(new Date());
const monthStart = `${today.slice(0, 8)}01`;
const displayDate = value => new Date(value).toISOString().slice(0, 10);

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [learners, setLearners] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [courseId, setCourseId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get("/api/courses", { params: { limit: 100 } }),
      apiClient.get("/api/users", { params: { role: "TRAINER", limit: 100 } }),
      apiClient.get("/api/users", { params: { role: "LEARNER", limit: 100 } }),
    ]).then(([courseResponse, trainerResponse, learnerResponse]) => {
      if (!active) return;
      setCourses(dataOf(courseResponse).items || []);
      setTrainers(dataOf(trainerResponse).items || []);
      setLearners(dataOf(learnerResponse).items || []);
    }).catch(loadError => { if (active) setError(loadError.message || "Could not load attendance filters."); });
    return () => { active = false; };
  }, []);

  useEffect(() => { setPage(1); }, [from, to, courseId, trainerId, learnerId]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await apiClient.get("/api/attendance", { params: { limit: 25, page, from: from || undefined, to: to || undefined, courseId: courseId || undefined, trainerId: trainerId || undefined, learnerId: learnerId || undefined } });
      const data = dataOf(response);
      setRecords(data.items || []); setSummary(data.summary || {}); setTotal(data.total || 0); setTotalPages(data.totalPages || 1);
    } catch (loadError) { setError(loadError.message || "Could not load attendance records."); }
    finally { setLoading(false); }
  }, [page, from, to, courseId, trainerId, learnerId]);
  useEffect(() => { load(); }, [load]);

  const visible = records.filter(item => `${item.learnerId?.name || ""} ${item.learnerId?.email || ""} ${item.courseId?.title || ""} ${item.trainerId?.name || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const exportCsv = () => {
    const quote = value => `"${String(value || "").replaceAll('"', '""')}"`;
    const rows = [["Date", "Learner", "Email", "Course", "Assigned trainer", "Session", "Status", "Note"], ...visible.map(item => [displayDate(item.attendanceDate), item.learnerId?.name, item.learnerId?.email, item.courseId?.title, item.trainerId?.name, item.sessionName, item.status, item.note])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "attendance-report.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="page attendance-report-page">
    <header className="page-head"><div><p>LEARNER MANAGEMENT</p><h1>Attendance</h1><span>Review learner attendance with each course and assigned trainer.</span></div><button className="primary attendance-export" onClick={exportCsv} disabled={!visible.length}><Download size={16}/>Export visible records</button></header>
    {error && <div className="attendance-report-error" role="alert">{error}</div>}
    <div className="attendance-report-stats"><article><ClipboardCheck/><div><b>{total}</b><span>Attendance records</span></div></article><article><Users/><div><b>{summary.PRESENT || 0}</b><span>Present</span></div></article><article><CalendarDays/><div><b>{summary.ABSENT || 0}</b><span>Absent</span></div></article><article><div className="attendance-report-late">{summary.LATE || 0}</div><div><b>{summary.LATE || 0}</b><span>Late</span></div></article></div>
    <section className="panel attendance-report-panel">
      <div className="attendance-report-filters"><label className="attendance-report-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search visible learners and courses"/></label>
        <select aria-label="Filter by learner" value={learnerId} onChange={event => setLearnerId(event.target.value)}><option value="">All learners</option>{learners.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        <select aria-label="Filter by course" value={courseId} onChange={event => setCourseId(event.target.value)}><option value="">All courses</option>{courses.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select>
        <select aria-label="Filter by trainer" value={trainerId} onChange={event => setTrainerId(event.target.value)}><option value="">All trainers</option>{trainers.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        <label className="attendance-report-date">From<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label className="attendance-report-date">To<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
      </div>
      {loading ? <div className="attendance-report-empty"><LoaderCircle className="attendance-report-spin"/>Loading attendance records…</div> : visible.length ? <div className="attendance-report-table-wrap"><table><thead><tr><th>Date / session</th><th>Learner</th><th>Course</th><th>Assigned trainer</th><th>Status</th><th>Note</th></tr></thead><tbody>{visible.map(item => <tr key={item._id}><td>{displayDate(item.attendanceDate)}<small>{item.sessionName || "Course session"}</small></td><td><b>{item.learnerId?.name || "Learner"}</b><small>{item.learnerId?.email}</small></td><td>{item.courseId?.title || "Course"}</td><td>{item.trainerId?.name || "Trainer"}<small>{item.trainerId?.email}</small></td><td><span className={`attendance-report-status ${String(item.status).toLowerCase()}`}>{item.status}</span></td><td>{item.note || "—"}</td></tr>)}</tbody></table></div> : <div className="attendance-report-empty"><ClipboardCheck size={30}/><b>No attendance records found</b><span>Change the filters, or records will appear here when trainers take attendance.</span></div>}
      <footer className="attendance-report-pagination"><span>Showing {total ? (page - 1) * 25 + 1 : 0}–{Math.min(page * 25, total)} of {total}</span><div><button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</button></div></footer>
    </section>
  </section>;
}
