import { PageHeader } from "../components/Shared";
import BillingPage from "./BillingPage";
import BrandingPage from "./BrandingPage";
import SettingsPage from "./SettingsPage";
import AuditLogsPage from "./AuditLogsPage";

const meta = {
  billing: ["Billing & subscriptions", "Manage plan, invoices, payment methods and platform usage."],
  settings: ["Platform settings", "Configure security, organization defaults and learning policies."],
  branding: ["Branding", "Customize the institute identity learners see across the platform."],
  "audit-logs": ["Audit logs", "A permanent record of important administrative and academic actions."]
};

export default function SuperWorkspacePage({ page }) {
  const [title, desc] = meta[page] || ["Workspace", "Platform-level controls and configuration."];
  return <section className="page">
    <PageHeader title={title} desc={desc} action={page === "branding" ? "Save branding" : page === "billing" ? "Download invoice" : page === "audit-logs" ? "Export logs" : undefined} />
    {page === "billing" ? <BillingPage /> : page === "branding" ? <BrandingPage /> : page === "settings" ? <SettingsPage /> : <AuditLogsPage />}
  </section>;
}
