import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Badge, PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";

const initialComposer = { audience: "LEARNERS", title: "", body: "" };
function responseData(response) { return response?.data?.data || {}; }
function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [composer, setComposer] = useState(initialComposer);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = responseData(await apiClient.get("/api/admin/notifications", { params: { limit: 100 } })).items || [];
      setItems(rows); setError("");
    } catch (loadError) { setError(loadError.message || "Could not load notification history."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (!composer.title.trim() || !composer.body.trim() || sending) { setMessage("Enter both a title and message."); return; }
    setSending(true); setError(""); setMessage("");
    try {
      const result = responseData(await apiClient.post("/api/admin/notifications", composer));
      setComposer(initialComposer);
      setMessage(`In-app notification sent to ${result.recipientCount} users.`);
      await load();
    } catch (sendError) { setError(sendError.message || "Could not send the notification."); }
    finally { setSending(false); }
  };

  return (
    <section className="page">
      <PageHeader title="Notifications" desc="Send in-app announcements and review your delivery history." />
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="notification-layout">
        <section className="panel">
          {loading ? <p role="status">Loading notification history…</p> : items.length ? items.map(item => (
            <article className="notification-row" key={item._id}>
              <span className="notice-icon"><Bell size={18} /></span>
              <div><b>{item.metadata?.title || "Announcement"}</b><small>{item.metadata?.audience || "Users"} · In-app · {item.metadata?.recipientCount ?? 0} recipients · {formatTime(item.createdAt)}</small></div>
              <Badge>Sent</Badge>
            </article>
          )) : <div className="empty"><Bell size={30}/><h2>No notifications sent</h2><p>Your in-app announcement history will appear here.</p></div>}
        </section>
        <aside className="panel">
          <h2>Notification composer</h2>
          <label className="field">Audience<select value={composer.audience} onChange={event => setComposer(value => ({ ...value, audience: event.target.value }))}><option value="ALL_USERS">All active users</option><option value="ADMINS">Admins</option><option value="TRAINERS">Trainers</option><option value="LEARNERS">Learners</option><option value="EXPIRING_LEARNERS">Learners expiring within 30 days</option></select></label>
          <label className="field">Channel<input value="In-app" readOnly /></label>
          <label className="field">Title<input maxLength={180} value={composer.title} onChange={event => setComposer(value => ({ ...value, title: event.target.value }))} placeholder="Notification title" /></label>
          <label className="field">Message<textarea maxLength={2000} value={composer.body} onChange={event => setComposer(value => ({ ...value, body: event.target.value }))} placeholder="Write a message for the selected audience…" /></label>
          {message && <p className="field-help" role="status">{message}</p>}
          <button className="primary" disabled={sending || loading} onClick={() => void send()}>{sending ? "Sending…" : "Send notification"}</button>
        </aside>
      </div>
    </section>
  );
}
