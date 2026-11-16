import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Badge, PageHeader } from "../components/Shared";
import { apiClient } from "../services/api";

function responseData(response) { return response?.data?.data || {}; }
function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const ticket = items.find(item => String(item._id) === String(selectedId));
  const requesterId = ticket?.requesterId?._id || ticket?.requesterId;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const rows = responseData(await apiClient.get("/api/learner/support", { params: { limit: 100 } })).items || [];
      setItems(rows);
      setSelectedId(current => rows.some(row => String(row._id) === String(current)) ? current : rows[0]?._id || "");
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load support requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);
  useEffect(() => {
    let active = true;
    if (!requesterId) { setMessages([]); return () => { active = false; }; }
    apiClient.get("/api/learner/messages", { params: { withUserId: requesterId, limit: 100 } })
      .then(response => { if (active) setMessages(responseData(response).items || []); })
      .catch(loadError => { if (active) setError(loadError.message || "Could not load this conversation."); });
    return () => { active = false; };
  }, [requesterId]);

  const sendReply = async () => {
    if (!ticket || !requesterId || !draft.trim() || sending) return;
    setSending(true); setError(""); setNotice("");
    try {
      await apiClient.post("/api/learner/messages", { recipientId: requesterId, body: draft.trim() });
      await apiClient.patch(`/api/learner/support/${ticket._id}`, { status: "IN_PROGRESS" });
      setDraft("");
      setNotice("Reply sent to the requester.");
      await Promise.all([loadTickets(), apiClient.get("/api/learner/messages", { params: { withUserId: requesterId, limit: 100 } }).then(response => setMessages(responseData(response).items || []))]);
    } catch (sendError) {
      setError(sendError.message || "Could not send the reply.");
    } finally { setSending(false); }
  };

  const changeStatus = async (status) => {
    if (!ticket) return;
    setError(""); setNotice("");
    try {
      await apiClient.patch(`/api/learner/support/${ticket._id}`, { status });
      await loadTickets();
      setNotice("Support request status updated.");
    } catch (statusError) { setError(statusError.message || "Could not update the request."); }
  };

  return (
    <section className="page">
      <PageHeader title="Messages & Support" desc="Reply to learner requests and track their status." />
      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <div className="panel" role="status">Loading support requests…</div> : ticket ? (
        <div className="messages">
          <section className="panel ticket-list">
            {items.map(item => {
              const id = String(item._id);
              const name = item.requesterId?.name || "Learner";
              return <button className={id === String(selectedId) ? "selected" : ""} onClick={() => { setSelectedId(id); setNotice(""); }} key={id}>
                <span>{String(item.subject || "?").split(" ").map(part => part[0]).join("").slice(0, 3)}</span>
                <div><b>{item.subject}</b><small>{name}</small><em>{item.category}</em></div>
                <Badge>{item.status}</Badge>
              </button>;
            })}
          </section>
          <section className="panel conversation">
            <div className="conversation-head"><div><h2>{ticket.subject}</h2><span>{ticket.category} · {ticket.requesterId?.name || "Learner"}</span></div>
              <label className="field">Status<select aria-label="Support request status" value={ticket.status} onChange={event => void changeStatus(event.target.value)}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></label>
            </div>
            <div className="chat">
              <article><b>{ticket.requesterId?.name || "Learner"}</b><p>{ticket.description}</p><small>{formatTime(ticket.createdAt)}</small></article>
              {messages.map(message => {
                const mine = String(message.senderId?._id || message.senderId) !== String(requesterId);
                return <article className={mine ? "agent" : ""} key={message._id}><b>{mine ? "Administrator" : ticket.requesterId?.name || "Learner"}</b><p>{message.body}</p><small>{formatTime(message.createdAt)}</small></article>;
              })}
            </div>
            <div className="reply"><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={5000} placeholder="Write a reply…" /><button className="primary" disabled={!draft.trim() || sending} onClick={() => void sendReply()}><Mail size={16} /> {sending ? "Sending…" : "Send reply"}</button></div>
          </section>
        </div>
      ) : <div className="panel"><div className="empty"><Mail size={30}/><h2>{error ? "Requests could not be loaded" : "No support requests"}</h2><p>{error ? "Check the API connection and try again." : "Learner support requests will appear here."}</p></div></div>}
    </section>
  );
}
