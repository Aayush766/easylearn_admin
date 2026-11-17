import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { readDemo, readEntity, writeDemo, writeEntity } from "./admin/services/localStore";
import AdminLayout from "./admin/components/AdminLayout";
import DashboardPage from "./admin/pages/DashboardPage";
import ReportsPage from "./admin/pages/ReportsPage";
import NotificationsPage from "./admin/pages/NotificationsPage";
// import MessagesPage from "./admin/pages/MessagesPage";
import ProfilePage from "./admin/pages/ProfilePage";
import CoursesPage from "./admin/pages/CoursesPage";
import CategoriesPage from "./admin/pages/CategoriesPage";
import ModulesPage from "./admin/pages/ModulesPage";
import CourseContentPage from "./admin/pages/CourseContentPage";
import LearnersPage from "./admin/pages/LearnersPage";
import TrainersPage from "./admin/pages/TrainersPage";
import TrainerAssignmentPage from "./admin/pages/TrainerAssignmentPage";
import EnrollmentsPage from "./admin/pages/EnrollmentsPage";
import RenewalsPage from "./admin/pages/RenewalsPage";
import AssessmentsPage from "./admin/pages/AssessmentsPage";
import ResultsPage from "./admin/pages/ResultsPage";
import CertificatesPage from "./admin/pages/CertificatesPage";
import AdminManagementPage from "./admin/pages/AdminManagementPage";
import LandingPageEditor from "./admin/pages/LandingPageEditor";
import AdminLoginPage, { LoginChooser } from "./admin/pages/AdminLoginPage";
import { me, refresh } from "./admin/services/auth";

const operational = [
  ["courses", CoursesPage],
  ["categories", CategoriesPage],
  ["modules", ModulesPage],
  ["course-content", CourseContentPage],
  ["learners", LearnersPage],
  ["trainers", TrainersPage],
  ["trainer-assignment", TrainerAssignmentPage],
  ["enrollments", EnrollmentsPage],
  ["renewals", RenewalsPage],
  ["assessments", AssessmentsPage],
  ["results", ResultsPage],
  ["certificates", CertificatesPage],
];

const communication = [
  ["notifications", NotificationsPage],
  // ["messages", MessagesPage],
];

function AdminRoutes({ superAdmin = false }) {
  const [forceFirstPasswordChange, setForceFirstPasswordChange] = useState(() => {
    const session = readDemo("auth-session", null);
    return !superAdmin && session?.role === "admin" && session.mustChangePassword;
  });
  const session = readDemo("auth-session", null);
  const base = superAdmin ? "/super-admin" : "/admin";
  const superOnly = [
    ["admins", AdminManagementPage],
    ["branding", LandingPageEditor],
  ];

  return (
    <AdminLayout isSuperAdmin={superAdmin}>
      <Routes>
        <Route index element={<DashboardPage isSuperAdmin={superAdmin} />} />
        {operational.map(([path, Component]) => <Route key={path} path={path} element={<Component />} />)}
        <Route path="reports" element={<ReportsPage />} />
        {!superAdmin && communication.map(([path, Component]) => <Route key={path} path={path} element={<Component />} />)}
        {superAdmin && superOnly.map(([path, Component]) => <Route key={path} path={path} element={<Component />} />)}
        <Route path="profile" element={<ProfilePage isSuperAdmin={superAdmin} />} />
        {/* <Route path="support" element={<SupportPage />} /> */}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
      {!superAdmin && forceFirstPasswordChange && <FirstAdminPasswordChange adminId={session?.adminId} onComplete={() => setForceFirstPasswordChange(false)} />}
    </AdminLayout>
  );
}

function FirstAdminPasswordChange({ adminId, onComplete }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function savePassword(event) {
    event.preventDefault();
    if (password.length < 6) return setError("Use at least 6 characters for your new password.");
    if (password !== confirmPassword) return setError("The passwords do not match.");
    const admins = readEntity("admins");
    const accountIndex = admins.findIndex(account => account.id === adminId);
    if (accountIndex < 0) return setError("We could not find your Admin account. Please sign in again.");
    const updated = admins.map((account, index) => index === accountIndex
      ? { ...account, password, mustChangePassword: false }
      : account);
    writeEntity("admins", updated);
    const currentSession = readDemo("auth-session", {});
    writeDemo("auth-session", { ...currentSession, mustChangePassword: false });
    onComplete();
  }

  return (
    <div className="backdrop first-password-backdrop">
      <section className="modal first-password-dialog" role="dialog" aria-modal="true" aria-labelledby="first-password-title">
        <header><span className="eyebrow">One more step</span><h2 id="first-password-title">Change your temporary password</h2><p>Set a new password before continuing. You’ll only see this prompt once.</p></header>
        <form className="first-password-form" onSubmit={savePassword}>
          <label className="field">New password<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} autoFocus /></label>
          <label className="field">Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={6} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit">Save new password</button>
        </form>
      </section>
    </div>
  );
}

function AdminProtected({ superAdmin = false }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    refresh().then(me).then(({ user }) => {
      if (!active) return;
      const expected = superAdmin ? "SUPER_ADMIN" : "ADMIN";
      if (user?.role === expected) {
        writeDemo("auth-session", { role: superAdmin ? "super-admin" : "admin", adminId: user._id, email: user.email, mustChangePassword: false });
        setState("ok");
      } else setState("denied");
    }).catch(() => { if (active) setState("denied"); });
    return () => { active = false; };
  }, [superAdmin]);
  if (state === "loading") return <main className="page"><p role="status">Checking your secure session…</p></main>;
  if (state !== "ok") return <Navigate to={`/login/${superAdmin ? "super-admin" : "admin"}`} replace />;
  return <AdminRoutes superAdmin={superAdmin} />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginChooser />} />
      <Route path="/login/:role" element={<AdminLoginPage />} />
      <Route path="/admin/*" element={<AdminProtected />} />
      <Route path="/super-admin/*" element={<AdminProtected superAdmin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}




































