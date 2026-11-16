import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";

const reports = {
  "Course-wise": { label: "Course-wise report", endpoint: "/api/admin/reports", params: { type: "course" } },
  "Learner-wise": { label: "Learner-wise report", endpoint: "/api/admin/reports", params: { type: "learner" } },
  "Trainer-wise": { label: "Trainer-wise report", endpoint: "/api/users", params: { role: "TRAINER" } },
};

function rowsFrom(response, type) {
  const data = response?.data?.data || {};
  return type === "Trainer-wise" ? data.items || [] : data.rows || [];
}

function valueFor(row, key) {
  const value = row[key];
  if (value && typeof value === "object") return value.name || value.title || value.email || "";
  return value ?? "";
}

export default function ReportsPage() {
  const [type, setType] = useState("Course-wise");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const keys = useMemo(() => [...new Set(items.flatMap(row => Object.keys(row).filter(key => !key.startsWith("_") && key !== "__v")))].slice(0, 8), [items]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const report = reports[type];
    apiClient.get(report.endpoint, { params: { ...report.params, limit: 100 } })
      .then(response => {
        if (!active) return;
        setItems(rowsFrom(response, type));
        setError("");
      })
      .catch(requestError => { if (active) { setItems([]); setError(requestError.message || "Could not load this report."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  const exportCsv = () => {
    if (!items.length) return;
    const csv = [keys, ...items.map(row => keys.map(key => valueFor(row, key)))].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `prime-easy-learn-${type.toLowerCase().replaceAll(" ", "-")}-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice("CSV report downloaded.");
  };

  return (
    <section className="page">
      <PageHeader title="Reports & analytics" desc="Review live course, learner and trainer records." action="Export report" onAction={exportCsv} />
      <section className="panel">
        <div className="panel-head">
          <div><h2>{reports[type].label}</h2><span>Data loaded from the server</span></div>
          <div className="report-actions">
            <select value={type} onChange={event => { setType(event.target.value); setNotice(""); }} aria-label="Report type">
              {Object.keys(reports).map(key => <option key={key} value={key}>{key}</option>)}
            </select>
            <button onClick={exportCsv} disabled={!items.length}><FileSpreadsheet /> CSV</button>
            <button onClick={() => window.print()}><FileText /> Print / PDF</button>
          </div>
        </div>
        {error && <p className="login-error" role="alert">{error}</p>}
        {loading ? <p role="status">Loading report…</p> : items.length ? <div className="table-wrap"><table><thead><tr>{keys.map(key => <th key={key}>{key.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{items.map((row, index) => <tr key={row._id || row.id || index}>{keys.map(key => <td key={key}>{String(valueFor(row, key))}</td>)}</tr>)}</tbody></table></div> : <div className="empty"><h2>No records found</h2><p>This report will show records after they are added to the platform.</p></div>}
        {notice && <p className="field-help" role="status">{notice}</p>}
      </section>
    </section>
  );
}
