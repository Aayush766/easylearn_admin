# Prime Easy Learn LMS — Admin + Super Admin

This package contains the corrected Admin/Super Admin portal built from the supplied PRD, architecture, rules and UI specification.

## What was fixed

- Replaced the old array-index CRUD model with resource/field based forms.
- Added complete field definitions for courses, categories, modules, learners, trainers, trainer assignments, enrollments, renewals, assessments, results, certificates, admins, reports, notifications, messages, billing and audit logs.
- Added correct role-aware navigation:
  - Admin: operational/academic management.
  - Super Admin: Admin Management + platform-only controls.
- Added validation for required fields and assessment rules.
- Added API service layer with Axios, credentials, error normalization and in-memory access-token support.
- Added mock API mode so the UI remains usable without a backend.
- Added CSV export and learner import hook.
- Fixed notification/message data to use the same object model as the rest of the app.
- Fixed audit-log resource naming.
- Added a complete Super Admin → Admin → Trainer → Learner flow document.

## API mode

Default:

```env
VITE_API_BASE_URL=https://easylearn-server.onrender.com
VITE_USE_MOCK_API=true
```

For the real backend:

```env
VITE_API_BASE_URL=https://your-api.example.com
VITE_USE_MOCK_API=false
```

The service layer uses the API structure defined by the supplied architecture:

```text
/api/auth
/api/users
/api/courses
/api/categories
/api/modules
/api/content
/api/enrollments
/api/assessments
/api/questions
/api/attempts
/api/progress
/api/certificates
/api/results
/api/reports
/api/notifications
/api/messages
```

Additional operational endpoints used by this admin UI:

```text
/api/trainer-assignments
/api/enrollments/renew
/api/billing
/api/audit-logs
```

The backend should expose those resources or adapt the endpoint map in `src/admin/data.js`.

## Authentication

The backend should use:

```text
JWT access token
+
HTTP-only refresh cookie
+
short-lived access token
```

The frontend does not persist passwords or tokens in localStorage. The temporary access token is held in memory only.

## Security boundary

The UI is not the security boundary.

The backend must enforce:

```text
authenticate()
 ↓
authorize(role)
 ↓
resource-level authorization
 ↓
controller
 ↓
service
 ↓
model
```

Trainer operations must verify trainer-to-course assignment.

Learner content operations must verify active enrollment and validity dates.

Assessment scoring must be calculated server-side.

## Recommended end-to-end flow

```text
SUPER ADMIN
  ↓
Create Admin
  ↓
ADMIN
  ↓
Create Category
  ↓
Create Course
  ↓
Create Modules
  ↓
Assign Trainer
  ↓
Create / Import Learners
  ↓
Create Enrollment
  ↓
Start Date + Validity
  ↓
TRAINER
  ↓
Assigned Course
  ↓
Upload Video / PDF / PPT
  ↓
Create PRE / POST / MODULE Assessment
  ↓
Publish
  ↓
LEARNER
  ↓
Active Enrollment Check
  ↓
Pre Assessment
  ↓
Course Content + Progress
  ↓
Post Assessment
  ↓
Server-side Result
  ↓
Pre/Post Improvement
  ↓
Completion
  ↓
Certificate
  ↓
Admin / Super Admin Reports
```

See `ADMIN_SUPER_ADMIN_FLOW.md` for the detailed role and API flow.
