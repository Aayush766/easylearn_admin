import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMemo } from "react";
import {
  Bell, BookOpen, CalendarClock, ChartNoAxesCombined, ClipboardCheck,
  CreditCard, FileBadge2, FileQuestion, GraduationCap, History, Layers3, BarChart3,
  LayoutDashboard, LogOut, Menu, Palette, Settings2, Tags,
  UserCircle, UserCog, UserRoundCheck, Users, X
} from "lucide-react";
import "./AdminLayout.css";
import { readEntity, writeDemo } from "../services/localStore";
import logo from "../../assets/logo.jpeg";
import { logout } from "../services/auth";

const searchableEntities = [
  ["courses", "Courses", "title"], ["categories", "Categories", "name"], ["modules", "Modules & Lessons", "title"],
  ["learners", "Learners", "name"], ["trainers", "Trainers", "name"], ["trainer-assignment", "Trainer Assignment", "trainer"],
  ["enrollments", "Enrollments", "learner"], ["renewals", "Extension & Renewal", "learner"], ["assessments", "Assessments", "title"],
  ["results", "Results", "learner"], ["certificates", "Certificates", "learner"], ["admins", "Admins", "name"],
  ["billing", "Billing", "invoiceNumber"], ["audit-logs", "Audit Logs", "description"], ["notifications", "Notifications", "title"],
];
const searchablePages = ["reports", "notifications", "profile", "admins", "billing", "settings", "branding", "audit-logs"];

const coreNavigation = [
  ["Dashboard", "", LayoutDashboard],
  ["Courses", "courses", BookOpen],
  ["Learners", "learners", Users],
  ["Trainers", "trainers", GraduationCap],
  ["Enrollments", "enrollments", ClipboardCheck],
  ["Assessments", "assessments", FileQuestion],
  ["Results", "results", ChartNoAxesCombined],
  ["Certificates", "certificates", FileBadge2],
  // ["Reports", "reports", BarChart3],
];

const operationsNavigation = [
  ["Categories", "categories", Tags],
  ["Modules & Lessons", "modules", Layers3],
  ["Trainer Assignment", "trainer-assignment", UserRoundCheck],
  ["Extension & Renewal", "renewals", CalendarClock],
];

const communicationNavigation = [
  ["Notifications", "notifications", Bell],
  // ["Messages & Support", "messages", MessageSquare],
];

const superNavigation = [
  ["Admins", "admins", UserCog],
  ["Branding", "branding", Palette],
  // ["Billing", "billing", CreditCard],
  // ["Platform Settings", "settings", Settings2],
  // ["Branding", "branding", Palette],
  // ["Audit Logs", "audit-logs", History],
];

function NavGroup({ title, items, base, onNavigate }) {
  return (
    <div className="admin-nav-group">
      <div className="admin-nav-group-title">{title}</div>
      <nav aria-label={title}>
        {items.map(([label, path, Icon]) => (
          <NavLink
            end={!path}
            onClick={onNavigate}
            to={path ? `${base}/${path}` : base}
            key={label}
            className={({ isActive }) => `admin-nav${isActive ? " is-active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function AdminLayout({ children, isSuperAdmin = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const base = isSuperAdmin ? "/super-admin" : "/admin";
  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    const entityResults = searchableEntities.flatMap(([key, label, titleKey]) => (!isSuperAdmin && ["admins", "billing", "audit-logs"].includes(key) ? [] : readEntity(key))
      .filter(item => Object.values(item).some(value => String(value ?? "").toLowerCase().includes(term)))
      .map(item => ({
        key: `${key}-${item.id}`,
        title: item[titleKey] || item.name || item.email || item.id,
        subtitle: `${label}${item.email ? ` · ${item.email}` : item.status ? ` · ${item.status}` : ""}`,
        path: key,
        id: item.id,
      })));
    const sectionResults = searchablePages.filter(path => (isSuperAdmin || !["admins", "billing", "settings", "branding", "audit-logs"].includes(path)) && (path.includes(term) || path.replaceAll("-", " ").includes(term)))
      .map(path => ({ key: `page-${path}`, title: path.replaceAll("-", " ").replace(/\b\w/g, char => char.toUpperCase()), subtitle: "Open section", path }));
    return [...entityResults, ...sectionResults].slice(0, 8);
  }, [isSuperAdmin, search]);
  const selectSearchResult = result => {
    navigate(`${base}/${result.path}`, { state: { searchTerm: search.trim(), searchId: result.id } });
    setSearch("");
  };

  return (
    <div className="admin-shell">
      {open && <button className="admin-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`admin-sidebar${open ? " is-open" : ""}`}>
        <div className="admin-brand-wrap">
          <Link to={base} className="admin-brand">
            <img src={logo} alt="Prime Easy Learn" />
            <span><b>Prime Easy Learn</b><small>{isSuperAdmin ? "Super Admin Console" : "Admin Console"}</small></span>
          </Link>
          <button className="admin-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <div className="admin-role-label">{isSuperAdmin ? "Platform controls" : "Academic operations"}</div>

        <NavGroup title="Overview" items={coreNavigation} base={base} onNavigate={() => setOpen(false)} />
        <NavGroup title="Academic setup" items={operationsNavigation} base={base} onNavigate={() => setOpen(false)} />
        {!isSuperAdmin && <NavGroup title="Communication" items={communicationNavigation} base={base} onNavigate={() => setOpen(false)} />}

        {isSuperAdmin && <NavGroup title="Platform" items={superNavigation} base={base} onNavigate={() => setOpen(false)} />}

        <div className="admin-sidebar-bottom">
          <NavLink to={`${base}/profile`} onClick={() => setOpen(false)} className={({ isActive }) => `admin-nav${isActive ? " is-active" : ""}`}><UserCircle size={18} /><span>My Profile</span></NavLink>
          {/* <NavLink to={`${base}/support`} onClick={() => setOpen(false)} className={({ isActive }) => `admin-nav${isActive ? " is-active" : ""}`}><CircleHelp size={18} /><span>Help & Support</span></NavLink> */}
          <Link to="/" onClick={() => { writeDemo("auth-session", null); void logout(); }} className="admin-nav"><LogOut size={18} /><span>Logout</span></Link>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="admin-search-wrap">
          <label className="admin-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => {
              if (event.key === "Enter" && searchResults[0]) selectSearchResult(searchResults[0]);
              if (event.key === "Escape") setSearch("");
            }} aria-label="Search workspace" aria-expanded={search.trim().length >= 2} placeholder="Search courses, learners, trainers..." />
            <kbd>Ctrl K</kbd>
          </label>
          {search.trim().length >= 2 && <div className="admin-search-results" role="listbox" aria-label="Search results">
            {searchResults.length ? searchResults.map(result => <button type="button" key={result.key} role="option" onMouseDown={event => event.preventDefault()} onClick={() => selectSearchResult(result)}><span><b>{result.title}</b><small>{result.subtitle}</small></span><span className="search-result-arrow">↗</span></button>) : <p>No matching records. Try a name, email, course or section.</p>}
          </div>}
          </div>
          <div className="admin-actions">
            {!isSuperAdmin && <Link className="admin-bell" aria-label="Notifications" title="Open notifications" to={`${base}/notifications`}><Bell size={20} /></Link>}
            <span className="admin-divider" />
            <div className="admin-account">
              <span className="admin-avatar">{isSuperAdmin ? "SA" : "AD"}</span>
              <div><b>{isSuperAdmin ? "Super Admin" : "Administrator"}</b><small>{isSuperAdmin ? "Platform owner" : "Academic operations"}</small></div>
            </div>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </section>
    </div>
  );
}










