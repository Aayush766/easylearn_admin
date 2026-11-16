// Prime Easy Learn LMS — Admin/Super Admin configuration
// Field definitions follow the supplied LMS PRD, architecture, rules and UI specification.

export const config = {
  appName: "Prime Easy Learn",
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  currency: "INR",
  timezone: "Asia/Kolkata",

  courses: {
    title: "Courses",
    desc: "Create, manage and monitor learning courses.",
    action: "Add Course",
    endpoint: "/api/courses",
    columns: [
      { key: "title", label: "Course" },
      { key: "category", label: "Category" },
      { key: "trainer", label: "Trainer" },
      { key: "learners", label: "Learners" },
      { key: "modules", label: "Modules" },
      { key: "status", label: "Status", badge: true },
      { key: "updatedAt", label: "Updated" },
      { key: "order", label: "Display order" },
    ],
    fields: [
      { key: "title", label: "Course title", type: "text", required: true },
      { key: "categoryId", label: "Category", type: "select", optionsFrom: "categories", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "thumbnailData", label: "Course thumbnail", type: "image" },
      { key: "certificateOptions", label: "Certificate templates", type: "certificateOptions", defaultValue: [], helper: "Add one or more certificate choices learners can receive for this course." },
      { key: "trainerIds", label: "Assigned trainers", type: "multiselect", optionsFrom: "trainers" },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "PUBLISHED", "ARCHIVED"], required: true },
      { key: "order", label: "Display order", type: "courseOrder", required: true },
    ],
  },

  categories: {
    title: "Categories",
    desc: "Organize courses into structured learning categories.",
    action: "Add Category",
    endpoint: "/api/categories",
    columns: [
      { key: "name", label: "Category" },
      { key: "description", label: "Description" },
      { key: "courseCount", label: "Courses" },
      { key: "learnerCount", label: "Learners" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "name", label: "Category name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "ARCHIVED"], required: true },
    ],
  },

  modules: {
    title: "Modules & Lessons",
    desc: "Build course structure and control module/content ordering.",
    action: "Add Module",
    endpoint: "/api/modules",
    columns: [
      { key: "course", label: "Course" },
      { key: "title", label: "Module" },
      { key: "contentCount", label: "Content" },
      { key: "order", label: "Order" },
      { key: "status", label: "Status", badge: true },
      { key: "updatedAt", label: "Updated" },
    ],
    fields: [
      { key: "courseId", label: "Course", type: "select", optionsFrom: "courses", required: true },
      { key: "title", label: "Module title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "order", label: "Order", type: "moduleOrder", required: true },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "ARCHIVED"], defaultValue: "ACTIVE", required: true },
    ],
  },

  learners: {
    title: "Learners",
    desc: "Manage learner accounts, access and learning progress.",
    action: "Add Learner",
    endpoint: "/api/users",
    query: { role: "LEARNER" },
    columns: [
      { key: "name", label: "Learner" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "courses", label: "Courses" },
      { key: "activeEnrollments", label: "Active enrollments" },
      { key: "expiry", label: "Expiry" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "password", label: "Temporary password", type: "password", requiredOnCreate: true, sensitive: true },
      { key: "profileImage", label: "Profile image (optional)", type: "image" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "BLOCKED"], required: true },
    ],
  },

  trainers: {
    title: "Trainers",
    desc: "Manage trainer accounts and faculty assignments.",
    action: "Add Trainer",
    endpoint: "/api/users",
    query: { role: "TRAINER" },
    columns: [
      { key: "name", label: "Trainer" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "specialization", label: "Specialization" },
      { key: "courses", label: "Courses" },
      { key: "learners", label: "Learners" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "password", label: "Temporary password", type: "password", requiredOnCreate: true, sensitive: true },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "profileImage", label: "Profile image (optional)", type: "image" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "BLOCKED"], required: true },
    ],
  },

  "trainer-assignment": {
    title: "Trainer Assignment",
    desc: "Assign trainers to courses and maintain assignment history.",
    action: "Assign Trainer",
    endpoint: "/api/trainer-assignments",
    columns: [
      { key: "trainer", label: "Trainer" },
      { key: "course", label: "Course" },
      { key: "assignedAt", label: "Assigned" },
      { key: "learnerCount", label: "Learners" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "trainerId", label: "Trainer", type: "select", optionsFrom: "trainers", required: true },
      { key: "courseId", label: "Courses", type: "select", createType: "multiselect", optionsFrom: "courses", required: true, helper: "Select one or more courses for this trainer." },
      { key: "assignedAt", label: "Assigned date", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"], required: true },
    ],
  },

  enrollments: {
    title: "Enrollments",
    desc: "Create and manage time-bound learner course access.",
    action: "Create Enrollment",
    endpoint: "/api/enrollments",
    columns: [
      { key: "learner", label: "Learner" },
      { key: "course", label: "Course" },
      { key: "trainer", label: "Trainer" },
      { key: "startDate", label: "Start date" },
      { key: "expiryDate", label: "Expiry date" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "learnerId", label: "Learner", type: "select", optionsFrom: "learners", required: true },
      { key: "courseId", label: "Courses", type: "select", createType: "multiselect", optionsFrom: "courses", required: true, helper: "Select one or more courses for this learner." },
      { key: "startDate", label: "Start date", type: "date", required: true },
      { key: "validityDays", label: "Validity (days)", type: "number", min: 1, required: true, helper: "Example: 180 for 6 months or 365 for 1 year." },
      { key: "expiryDate", label: "Expiry date", type: "date", required: true, helper: "Set an expiry date or calculate it from the start date and validity." },
      { key: "source", label: "Enrollment source", type: "select", options: ["NEW", "RENEWAL"], required: true },
      { key: "status", label: "Status", type: "select", options: ["UPCOMING", "ACTIVE", "SUSPENDED", "COMPLETED"], required: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },

  renewals: {
    title: "Extension & Renewal",
    desc: "Extend or renew access without overwriting historical enrollment cycles.",
    action: "Create Renewal",
    endpoint: "/api/enrollments/renew",
    columns: [
      { key: "learner", label: "Learner" },
      { key: "course", label: "Course" },
      { key: "currentExpiry", label: "Current end date" },
      { key: "newStartDate", label: "Start date" },
      { key: "newExpiryDate", label: "End date" },
      { key: "validityDays", label: "Validity" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "enrollmentId", label: "Current enrollment", type: "select", optionsFrom: "enrollments", required: true },
      { key: "newStartDate", label: "Start date", type: "date", required: true },
      { key: "newExpiryDate", label: "End date", type: "date", required: true },
    ],
  },

  assessments: {
    title: "Assessments",
    desc: "Create and oversee pre, post and module assessments.",
    action: "Create Assessment",
    endpoint: "/api/assessments",
    columns: [
      { key: "title", label: "Assessment" },
      { key: "course", label: "Course" },
      { key: "module", label: "Module" },
      { key: "type", label: "Type" },
      { key: "questions", label: "Questions" },
      { key: "totalMarks", label: "Marks" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "title", label: "Assessment title", type: "text", required: true },
      { key: "courseId", label: "Course", type: "select", optionsFrom: "courses", required: true },
      { key: "moduleId", label: "Module / topic", type: "select", optionsFrom: "modules" },
      { key: "type", label: "Assessment type", type: "select", options: ["PRE", "POST", "MODULE"], required: true },
      { key: "totalMarks", label: "Total marks", type: "number", min: 1, required: true },
      { key: "passingMarks", label: "Passing marks", type: "number", min: 0, required: true },
      { key: "duration", label: "Time limit (minutes)", type: "number", min: 1 },
      { key: "attemptLimit", label: "Attempt limit", type: "number", min: 1, required: true },
      { key: "startDate", label: "Start date", type: "datetime-local" },
      { key: "endDate", label: "End date", type: "datetime-local" },
      { key: "shuffleQuestions", label: "Shuffle questions", type: "checkbox" },
      { key: "shuffleOptions", label: "Shuffle options", type: "checkbox" },
      { key: "showResults", label: "Show results to learner", type: "checkbox", defaultValue: true },
      { key: "instructions", label: "Instructions", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "PUBLISHED"], required: true },
    ],
  },

  results: {
    title: "Results",
    desc: "Monitor assessment outcomes and learner performance.",
    action: null,
    endpoint: "/api/attempts",
    readOnly: true,
    columns: [
      { key: "learner", label: "Learner" },
      { key: "assessment", label: "Assessment" },
      { key: "attemptDate", label: "Attempt date" },
      { key: "score", label: "Score" },
      { key: "percentage", label: "Percentage" },
      { key: "result", label: "Result", badge: true },
    ],
    fields: [
      { key: "learnerId", label: "Learner", type: "text", readOnly: true },
      { key: "enrollmentId", label: "Enrollment", type: "text", readOnly: true },
      { key: "assessmentId", label: "Assessment", type: "text", readOnly: true },
      { key: "attemptDate", label: "Attempt date", type: "datetime-local", readOnly: true },
      { key: "score", label: "Score", type: "text", readOnly: true },
      { key: "totalMarks", label: "Total marks", type: "number", readOnly: true },
      { key: "percentage", label: "Percentage", type: "number", readOnly: true },
      { key: "result", label: "Result", type: "select", options: ["PASS", "FAIL"], readOnly: true },
    ],
  },

  certificates: {
    title: "Certificates",
    desc: "Issue, verify and manage learner certificates.",
    action: "Issue Certificate",
    endpoint: "/api/admin/certificates",
    columns: [
      { key: "certificateNumber", label: "Certificate No." },
      { key: "learner", label: "Learner" },
      { key: "course", label: "Course" },
      { key: "issueDate", label: "Issued" },
      { key: "verificationCode", label: "Verification" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "certificateNumber", label: "Certificate number", type: "text", required: true },
      { key: "learnerId", label: "Learner", type: "select", optionsFrom: "learners", required: true },
      { key: "courseId", label: "Course", type: "select", optionsFrom: "courses", required: true },
      { key: "certificateOptionId", label: "Certificate option", type: "certificateOption" },
      { key: "enrollmentId", label: "Enrollment", type: "select", optionsFrom: "enrollments", required: true },
      { key: "issueDate", label: "Issue date", type: "date", required: true },
      { key: "score", label: "Score", type: "number", min: 0 },
      { key: "verificationCode", label: "Verification code", type: "text", required: true },
      { key: "certificateUrl", label: "Certificate URL", type: "url" },
      { key: "status", label: "Status", type: "select", options: ["VALID", "REVOKED"], required: true },
    ],
  },

  admins: {
    title: "Admin Management",
    desc: "Create and manage operational administrators. Super Admin only.",
    action: "Add Admin",
    endpoint: "/api/users",
    query: { role: "ADMIN" },
    columns: [
      { key: "name", label: "Admin" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status", badge: true },
      { key: "lastLogin", label: "Last login" },
    ],
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "password", label: "Temporary password", type: "password", requiredOnCreate: true, sensitive: true },
      { key: "role", label: "Role", type: "select", options: ["ADMIN"], required: true },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "BLOCKED"], required: true },
    ],
  },

  reports: {
    title: "Reports",
    desc: "Generate learner-wise, course-wise and trainer-wise reports.",
    action: "Generate Report",
    endpoint: "/api/admin/reports",
    columns: [
      { key: "name", label: "Report" },
      { key: "type", label: "Type" },
      { key: "generatedBy", label: "Generated by" },
      { key: "generatedAt", label: "Generated" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "name", label: "Report name", type: "text", required: true },
      { key: "type", label: "Report type", type: "select", options: ["LEARNER", "COURSE", "TRAINER", "BATCH"], required: true },
      { key: "courseId", label: "Course", type: "select", optionsFrom: "courses" },
      { key: "trainerId", label: "Trainer", type: "select", optionsFrom: "trainers" },
      { key: "learnerId", label: "Learner", type: "select", optionsFrom: "learners" },
      { key: "dateFrom", label: "Date from", type: "date" },
      { key: "dateTo", label: "Date to", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["READY", "PROCESSING", "FAILED"], required: true },
    ],
  },

  notifications: {
    title: "Notifications",
    desc: "Create, schedule and monitor platform communications.",
    action: "Create Notification",
    endpoint: "/api/notifications",
    columns: [
      { key: "title", label: "Title" },
      { key: "audience", label: "Audience" },
      { key: "channel", label: "Channel" },
      { key: "scheduledAt", label: "Scheduled" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "audience", label: "Audience", type: "select", options: ["ALL_USERS", "ADMINS", "TRAINERS", "LEARNERS", "EXPIRING_LEARNERS"], required: true },
      { key: "channel", label: "Channel", type: "select", options: ["IN_APP", "EMAIL", "SMS", "WHATSAPP"], required: true },
      { key: "scheduledAt", label: "Scheduled at", type: "datetime-local" },
      { key: "body", label: "Message", type: "textarea", required: true },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "SCHEDULED", "SENT"], required: true },
    ],
  },

  messages: {
    title: "Messages & Support",
    desc: "Manage learner, trainer and platform support conversations.",
    action: "Create Message",
    endpoint: "/api/messages",
    columns: [
      { key: "subject", label: "Subject" },
      { key: "user", label: "User" },
      { key: "priority", label: "Priority", badge: true },
      { key: "status", label: "Status", badge: true },
      { key: "createdAt", label: "Created" },
    ],
    fields: [
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "userId", label: "User", type: "select", optionsFrom: "learners", required: true },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "MEDIUM", "HIGH"], required: true },
      { key: "body", label: "Message", type: "textarea", required: true },
      { key: "status", label: "Status", type: "select", options: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], required: true },
    ],
  },

  billing: {
    title: "Billing & Subscriptions",
    desc: "Maintain invoice and payment records. Payment collection is handled outside this dashboard.",
    action: "Create Invoice",
    endpoint: "/api/admin/billing/invoices",
    columns: [
      { key: "invoiceNumber", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "plan", label: "Plan" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Date" },
      { key: "status", label: "Payment", badge: true },
    ],
    fields: [
      { key: "invoiceNumber", label: "Invoice number", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "plan", label: "Plan", type: "text", required: true },
      { key: "amount", label: "Amount", type: "number", min: 0, required: true },
      { key: "date", label: "Invoice date", type: "date", required: true },
      { key: "paymentMethod", label: "Payment method", type: "select", options: ["ONLINE", "BANK_TRANSFER", "CASH", "OTHER"], required: true },
      { key: "status", label: "Payment status", type: "select", options: ["PAID", "PENDING", "FAILED", "REFUNDED"], required: true },
    ],
  },

  "audit-logs": {
    title: "Audit Logs",
    desc: "View a permanent record of important administrative and academic actions.",
    action: null,
    endpoint: "/api/audit-logs",
    readOnly: true,
    columns: [
      { key: "actor", label: "Actor" },
      { key: "action", label: "Action" },
      { key: "entityType", label: "Module" },
      { key: "entityId", label: "Entity" },
      { key: "description", label: "Description" },
      { key: "createdAt", label: "Date" },
    ],
    fields: [
      { key: "actor", label: "Actor", type: "text", readOnly: true },
      { key: "action", label: "Action", type: "text", readOnly: true },
      { key: "entityType", label: "Module", type: "text", readOnly: true },
      { key: "entityId", label: "Entity ID", type: "text", readOnly: true },
      { key: "description", label: "Description", type: "textarea", readOnly: true },
      { key: "createdAt", label: "Date", type: "datetime-local", readOnly: true },
    ],
  },
};

export const labels = Object.fromEntries(
  Object.entries(config).filter(([, value]) => value?.title).map(([key, value]) => [key, value.title])
);

export const endpointMap = Object.fromEntries(
  Object.entries(config).filter(([, value]) => value?.endpoint).map(([key, value]) => [key, value.endpoint])
);

// Seed data mirrors the API resource shapes. It is used only when VITE_USE_MOCK_API=true.
export const seed = {
  courses: [
    { id: "CRS-001", title: "JEE Main & Advanced", category: "Engineering", categoryId: "CAT-001", trainer: "Rahul Sharma", trainerIds: ["TRN-001"], learners: 248, modules: 15, description: "JEE entrance preparation.", status: "PUBLISHED", updatedAt: "22 Sep 2026", order: 1 },
    { id: "CRS-002", title: "NEET Complete Preparation", category: "Medical", categoryId: "CAT-002", trainer: "Priya Singh", trainerIds: ["TRN-002"], learners: 312, modules: 18, description: "NEET preparation program.", status: "PUBLISHED", updatedAt: "21 Sep 2026", order: 2 },
    { id: "CRS-003", title: "Foundation Mathematics", category: "Foundation", categoryId: "CAT-003", trainer: "Amit Kumar", trainerIds: ["TRN-003"], learners: 184, modules: 10, description: "Foundation mathematics.", status: "PUBLISHED", updatedAt: "20 Sep 2026", order: 3 },
    { id: "CRS-004", title: "CBSE Class 12 Science", category: "CBSE", categoryId: "CAT-004", trainer: "Neha Verma", trainerIds: ["TRN-004"], learners: 156, modules: 12, description: "CBSE Class 12 Science.", status: "DRAFT", updatedAt: "19 Sep 2026", order: 4 },
  ],
  categories: [
    { id: "CAT-001", name: "Engineering", description: "JEE and engineering entrance preparation", courseCount: 12, learnerCount: 248, status: "ACTIVE" },
    { id: "CAT-002", name: "Medical", description: "NEET and medical entrance preparation", courseCount: 9, learnerCount: 312, status: "ACTIVE" },
    { id: "CAT-003", name: "Foundation", description: "School foundation programs", courseCount: 8, learnerCount: 184, status: "ACTIVE" },
    { id: "CAT-004", name: "CBSE", description: "CBSE academic preparation", courseCount: 14, learnerCount: 276, status: "ACTIVE" },
  ],
  modules: [
    { id: "MOD-001", courseId: "CRS-001", course: "JEE Main & Advanced", title: "Physics Fundamentals", description: "Core concepts.", contentCount: 14, order: 1, status: "ACTIVE", updatedAt: "22 Sep 2026" },
    { id: "MOD-002", courseId: "CRS-001", course: "JEE Main & Advanced", title: "Mechanics", description: "Mechanics module.", contentCount: 21, order: 2, status: "ACTIVE", updatedAt: "21 Sep 2026" },
    { id: "MOD-003", courseId: "CRS-002", course: "NEET Complete Preparation", title: "Cell Biology", description: "Cell biology.", contentCount: 18, order: 1, status: "ACTIVE", updatedAt: "20 Sep 2026" },
  ],
  learners: [
    { id: "LRN-001", name: "Aarav Sharma", email: "aarav@example.com", phone: "+91 98765 00001", courses: 1, activeEnrollments: 1, expiry: "31 Mar 2027", progress: 78, status: "ACTIVE" },
    { id: "LRN-002", name: "Ananya Singh", email: "ananya@example.com", phone: "+91 98765 00002", courses: 1, activeEnrollments: 1, expiry: "30 Apr 2027", progress: 92, status: "ACTIVE" },
    { id: "LRN-003", name: "Rohan Kumar", email: "rohan@example.com", phone: "+91 98765 00003", courses: 1, activeEnrollments: 1, expiry: "14 Dec 2026", progress: 64, status: "ACTIVE" },
    { id: "LRN-004", name: "Ishita Verma", email: "ishita@example.com", phone: "+91 98765 00004", courses: 1, activeEnrollments: 0, expiry: "31 Dec 2026", progress: 81, status: "BLOCKED" },
  ],
  trainers: [
    { id: "TRN-001", name: "Rahul Sharma", email: "rahul@example.com", phone: "+91 98765 10001", specialization: "Physics", courses: 4, learners: 248, status: "ACTIVE" },
    { id: "TRN-002", name: "Priya Singh", email: "priya@example.com", phone: "+91 98765 10002", specialization: "Biology", courses: 3, learners: 312, status: "ACTIVE" },
    { id: "TRN-003", name: "Amit Kumar", email: "amit@example.com", phone: "+91 98765 10003", specialization: "Mathematics", courses: 5, learners: 184, status: "ACTIVE" },
    { id: "TRN-004", name: "Neha Verma", email: "neha@example.com", phone: "+91 98765 10004", specialization: "Chemistry", courses: 2, learners: 156, status: "BLOCKED" },
  ],
  "trainer-assignment": [
    { id: "ASN-001", trainerId: "TRN-001", trainer: "Rahul Sharma", courseId: "CRS-001", course: "JEE Main & Advanced", assignedAt: "15 Sep 2026", learnerCount: 248, status: "ACTIVE" },
    { id: "ASN-002", trainerId: "TRN-002", trainer: "Priya Singh", courseId: "CRS-002", course: "NEET Complete Preparation", assignedAt: "10 Sep 2026", learnerCount: 312, status: "ACTIVE" },
    { id: "ASN-003", trainerId: "TRN-003", trainer: "Amit Kumar", courseId: "CRS-003", course: "Foundation Mathematics", assignedAt: "08 Sep 2026", learnerCount: 184, status: "ACTIVE" },
  ],
  enrollments: [
    { id: "ENR-001", learnerId: "LRN-001", learner: "Aarav Sharma", courseId: "CRS-001", course: "JEE Main & Advanced", trainer: "Rahul Sharma", startDate: "01 Apr 2026", expiryDate: "31 Mar 2027", validityDays: 365, source: "NEW", status: "ACTIVE" },
    { id: "ENR-002", learnerId: "LRN-002", learner: "Ananya Singh", courseId: "CRS-002", course: "NEET Complete Preparation", trainer: "Priya Singh", startDate: "01 May 2026", expiryDate: "30 Apr 2027", validityDays: 365, source: "NEW", status: "ACTIVE" },
    { id: "ENR-003", learnerId: "LRN-003", learner: "Rohan Kumar", courseId: "CRS-003", course: "Foundation Mathematics", trainer: "Amit Kumar", startDate: "15 Jun 2026", expiryDate: "14 Dec 2026", validityDays: 182, source: "NEW", status: "ACTIVE" },
  ],
  renewals: [
    { id: "REN-001", enrollmentId: "ENR-003", learner: "Rohan Kumar", course: "Foundation Mathematics", currentExpiry: "14 Dec 2026", newStartDate: "15 Dec 2026", newExpiryDate: "13 Jun 2027", validityDays: 181, fee: 0, status: "PENDING" },
    { id: "REN-002", enrollmentId: "ENR-001", learner: "Aarav Sharma", course: "JEE Main & Advanced", currentExpiry: "31 Mar 2027", newStartDate: "01 Apr 2027", newExpiryDate: "31 Mar 2028", validityDays: 365, fee: 0, status: "APPROVED" },
  ],
  assessments: [
    { id: "ASM-001", title: "JEE Physics Mock Test 01", courseId: "CRS-001", course: "JEE Main & Advanced", moduleId: "MOD-001", module: "Physics Fundamentals", type: "MODULE", questions: 50, totalMarks: 50, passingMarks: 25, duration: 60, attemptLimit: 2, status: "PUBLISHED" },
    { id: "ASM-002", title: "NEET Baseline Assessment", courseId: "CRS-002", course: "NEET Complete Preparation", moduleId: "", module: "—", type: "PRE", questions: 100, totalMarks: 100, passingMarks: 0, duration: 90, attemptLimit: 1, status: "PUBLISHED" },
    { id: "ASM-003", title: "Foundation Post Assessment", courseId: "CRS-003", course: "Foundation Mathematics", moduleId: "", module: "—", type: "POST", questions: 30, totalMarks: 30, passingMarks: 18, duration: 45, attemptLimit: 2, status: "DRAFT" },
  ],
  results: [
    { id: "RES-001", learnerId: "LRN-001", learner: "Aarav Sharma", enrollmentId: "ENR-001", assessmentId: "ASM-001", assessment: "JEE Physics Mock Test 01", attemptDate: "22 Sep 2026, 10:15", score: "46/50", totalMarks: 50, percentage: 92, result: "PASS" },
    { id: "RES-002", learnerId: "LRN-002", learner: "Ananya Singh", enrollmentId: "ENR-002", assessmentId: "ASM-002", assessment: "NEET Baseline Assessment", attemptDate: "21 Sep 2026, 12:10", score: "91/100", totalMarks: 100, percentage: 91, result: "PASS" },
    { id: "RES-003", learnerId: "LRN-003", learner: "Rohan Kumar", enrollmentId: "ENR-003", assessmentId: "ASM-003", assessment: "Foundation Post Assessment", attemptDate: "20 Sep 2026, 15:40", score: "21/30", totalMarks: 30, percentage: 70, result: "PASS" },
  ],
  certificates: [
    { id: "CER-001", certificateNumber: "PEL-JEE-2026-001", learnerId: "LRN-001", learner: "Aarav Sharma", courseId: "CRS-001", course: "JEE Main & Advanced", enrollmentId: "ENR-001", issueDate: "20 Sep 2026", score: 92, verificationCode: "PEL-2026-JEE-A1Q9", status: "VALID" },
    { id: "CER-002", certificateNumber: "PEL-NEET-2026-002", learnerId: "LRN-002", learner: "Ananya Singh", courseId: "CRS-002", course: "NEET Complete Preparation", enrollmentId: "ENR-002", issueDate: "18 Sep 2026", score: 91, verificationCode: "PEL-2026-NEET-B4M2", status: "VALID" },
    { id: "CER-003", certificateNumber: "PEL-FND-2026-003", learnerId: "LRN-003", learner: "Rohan Kumar", courseId: "CRS-003", course: "Foundation Mathematics", enrollmentId: "ENR-003", issueDate: "12 Sep 2026", score: 88, verificationCode: "PEL-2026-FND-C8P1", status: "REVOKED" },
  ],
  admins: [
    { id: "ADM-001", name: "Rahul Mehta", email: "rahul.admin@example.com", phone: "+91 98765 20001", role: "ADMIN", status: "ACTIVE", lastLogin: "22 Sep 2026, 09:20" },
    { id: "ADM-002", name: "Neha Sharma", email: "neha.admin@example.com", phone: "+91 98765 20002", role: "ADMIN", status: "ACTIVE", lastLogin: "21 Sep 2026, 17:45" },
  ],
  reports: [
    { id: "RPT-001", name: "Monthly Enrollment Report", type: "BATCH", generatedBy: "Admin", generatedAt: "22 Sep 2026", status: "READY" },
    { id: "RPT-002", name: "Learner Performance Report", type: "LEARNER", generatedBy: "Admin", generatedAt: "21 Sep 2026", status: "READY" },
  ],
  notifications: [
    { id: "N-100", title: "New JEE course published", audience: "ALL_LEARNERS", channel: "IN_APP", scheduledAt: "22 Sep 2026", body: "A new course is now available.", status: "SENT" },
    { id: "N-101", title: "Assessment reminder", audience: "LEARNERS", channel: "EMAIL", scheduledAt: "22 Sep 2026", body: "Your assessment is due.", status: "SENT" },
    { id: "N-102", title: "Course expiry reminder", audience: "EXPIRING_LEARNERS", channel: "WHATSAPP", scheduledAt: "21 Sep 2026", body: "Your access is expiring soon.", status: "SCHEDULED" },
  ],
  messages: [
    { id: "MSG-001", subject: "Unable to access course", userId: "LRN-001", user: "Aarav Sharma", priority: "HIGH", body: "Learner cannot access course.", status: "OPEN", createdAt: "22 Sep 2026" },
    { id: "MSG-002", subject: "Certificate request", userId: "LRN-002", user: "Ananya Singh", priority: "MEDIUM", body: "Certificate verification request.", status: "IN_PROGRESS", createdAt: "22 Sep 2026" },
  ],
  billing: [
    { id: "INV-001", invoiceNumber: "INV-2026-09", customer: "Prime Easy Learn", plan: "Growth", amount: 39999, date: "22 Sep 2026", paymentMethod: "ONLINE", status: "PAID" },
    { id: "INV-002", invoiceNumber: "INV-2026-08", customer: "Prime Easy Learn", plan: "Growth", amount: 39999, date: "22 Aug 2026", paymentMethod: "ONLINE", status: "PAID" },
  ],
  "audit-logs": [
    { id: "LOG-001", actor: "Rahul Mehta", action: "CREATE", entityType: "Courses", entityId: "CRS-004", description: "Created CBSE Class 12 Science course", createdAt: "22 Sep 2026" },
    { id: "LOG-002", actor: "Neha Sharma", action: "UPDATE", entityType: "Learners", entityId: "LRN-003", description: "Updated learner profile", createdAt: "22 Sep 2026" },
    { id: "LOG-003", actor: "Super Admin", action: "UPDATE", entityType: "Settings", entityId: "PLATFORM", description: "Changed assessment policy", createdAt: "21 Sep 2026" },
  ],
};







