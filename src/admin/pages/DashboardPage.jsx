import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BookOpen, ClipboardCheck, ShieldCheck, Users } from "lucide-react";
import { PageHeader, StatCard } from "../components/Shared";
import { apiClient } from "../services/api";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function enrollmentMonths(rows, count) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  const months = Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: monthNames[date.getMonth()], value: 0 };
  });
  const byKey = new Map(months.map(month => [month.key, month]));
  rows.forEach(row => {
    const date = new Date(row.startDate);
    const month = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (month && !Number.isNaN(date.getTime())) month.value += 1;
  });
  const max = Math.max(1, ...months.map(month => month.value));
  return months.map(month => ({ ...month, height: month.value ? Math.max(8, Math.round((month.value / max) * 100)) : 0 }));
}

export default function DashboardPage({ isSuperAdmin = false }) {
  const navigate = useNavigate();
  const base = isSuperAdmin ? "/super-admin" : "/admin";
  const [period, setPeriod] = useState(6);
  const [summary, setSummary] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.get("/api/admin/summary"),
      apiClient.get("/api/enrollments", { params: { limit: 100 } }),
    ]).then(([summaryResponse, enrollmentResponse]) => {
      if (!active) return;
      setSummary(summaryResponse.data?.data || {});
      setEnrollments(enrollmentResponse.data?.data?.items || []);
      setError("");
    }).catch(requestError => {
      if (active) setError(requestError.message || "Could not load platform data.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const chart = useMemo(() => enrollmentMonths(enrollments, period), [enrollments, period]);
  const stats = isSuperAdmin
    ? [
        [summary?.learners, "Total learners", Users, ""],
        [summary?.courses, "Courses", BookOpen, "orange"],
        [summary?.enrollments, "Enrollments", ClipboardCheck, "green"],
        [summary?.certificates, "Valid certificates", Award, "purple"],
      ]
    : [
        [summary?.learners, "Total learners", Users, ""],
        [summary?.enrollments, "Enrollments", ClipboardCheck, "green"],
        [summary?.courses, "Courses", BookOpen, "orange"],
        [summary?.certificates, "Valid certificates", Award, "purple"],
      ];

  return (
    <section className="page">
      <PageHeader
        title={isSuperAdmin ? "Platform overview" : "Operations overview"}
        desc={isSuperAdmin ? "Live totals from your platform data." : "Live totals from your learning platform."}
        action={isSuperAdmin ? "Manage Admins" : "Enroll Learner"}
        onAction={() => navigate(isSuperAdmin ? `${base}/admins` : `${base}/enrollments`)}
      />

      {error && <div className="login-error" role="alert">{error}</div>}
      <div className="stats">
        {stats.map(([value, label, Icon, tone]) => <StatCard key={label} value={loading ? "…" : Number(value || 0).toLocaleString()} label={label} Icon={Icon} tone={tone} />)}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Enrollment activity</h2><span>Recorded enrollment start dates</span></div>
            <select value={period} onChange={event => setPeriod(Number(event.target.value))} aria-label="Enrollment chart period"><option value={6}>6 months</option><option value={12}>12 months</option></select>
          </div>
          {loading ? <p role="status">Loading enrollment activity…</p> : enrollments.length ? <div className="chart">{chart.map(month => <div className="chart-column" key={month.key} aria-label={`${month.label}: ${month.value} enrollments`}><i style={{ height: `${month.height}%` }} /><small>{month.label}</small></div>)}</div> : <div className="empty"><p>No enrollments recorded for the selected period.</p></div>}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Quick actions</h2><span>Open a management area</span></div></div>
          <div className="quick">
            <button onClick={() => navigate(`${base}/courses`)}><BookOpen />Manage courses <b>→</b></button>
            <button onClick={() => navigate(`${base}/learners`)}><Users />Manage learners <b>→</b></button>
            <button onClick={() => navigate(`${base}/reports`)}><ClipboardCheck />Open reports <b>→</b></button>
            {!isSuperAdmin && <button onClick={() => navigate(`${base}/trainer-assignment`)}><ShieldCheck />Assign trainers <b>→</b></button>}
            {isSuperAdmin && <button onClick={() => navigate(`${base}/admins`)}><ShieldCheck />Manage administrators <b>→</b></button>}
          </div>
        </section>
      </div>
    </section>
  );
}
