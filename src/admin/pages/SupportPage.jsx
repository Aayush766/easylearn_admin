import { BookOpen, ClipboardList, LifeBuoy } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/Shared";
export default function SupportPage() {
  const [open, setOpen] = useState("");
  const cards = [
    ["Course & content help", "Guidance for courses, modules, uploads and learner access.", BookOpen],
    ["Assessment help", "Support for assessment setup, grading and results.", ClipboardList],
    ["Contact support", "Open a ticket for urgent account or platform assistance.", LifeBuoy]
  ];
  return <section className="page"><PageHeader title="Help & support" desc="Find guidance or contact the Prime Easy Learn support team." />
    <div className="report-cards">{cards.map(([title, copy, Icon]) => <article key={title}><span><Icon /></span><h2>{title}</h2><p>{copy}</p><button onClick={() => setOpen(current => current === title ? "" : title)}>{open === title ? "Close guide ↑" : "Open guide →"}</button>{open === title && <p className="support-guide">{title === "Course & content help" ? "Create a category, add a course, then organize lessons into modules. Assign trainers and publish when the course is ready." : title === "Assessment help" ? "Create an assessment, set its pass mark and attempt limit, then review submissions from Results." : "For this demo, use Messages & Support to record a local support reply. No message is sent outside this browser."}</p>}</article>)}</div>
  </section>;
}
