# Prime Easy Learn LMS — Super Admin → Admin → Trainer → Learner Flow

This document is the implementation flow for the admin application and the existing client portals.

## 1. Role hierarchy

```text
SUPER ADMIN
   │
   ├── creates/manages ADMINS
   │
   └── controls the entire platform
          │
          ▼
       ADMIN
          │
          ├── creates courses/categories/modules
          ├── assigns trainers
          ├── creates/imports learners
          ├── enrolls learners + controls validity
          ├── extends/renews access
          ├── oversees assessments/results/certificates
          └── reports/notifications
                 │
                 ▼
              TRAINER
                 │
                 ├── sees assigned courses only
                 ├── uploads VIDEO/PDF/PPT
                 ├── selects course → module → lesson/topic
                 ├── creates PRE/POST/MODULE assessments
                 └── sees results for assigned-course learners
                        │
                        ▼
                     LEARNER
                        │
                        ├── sees active enrolled courses only
                        ├── pre assessment
                        ├── course content + progress/resume
                        ├── post assessment
                        ├── result + pre/post improvement
                        └── certificate after configured completion rules
```

Important: this is a permission/data relationship, not a frontend-only restriction. The backend must authenticate, authorize the role, and then authorize the specific resource.

## 2. Core authorization chain

```text
JWT / authenticated session
        ↓
ROLE
        ↓
COURSE ASSIGNMENT
        ↓
ENROLLMENT
        ↓
VALIDITY
        ↓
CONTENT / ASSESSMENT
        ↓
PROGRESS / RESULT
        ↓
CERTIFICATE
```

## 3. Super Admin

Can manage:

- Admins
- Trainers
- Learners
- Courses
- Categories
- Modules
- Trainer assignments
- Enrollments
- Renewals/extensions
- Assessments/results
- Certificates
- Reports
- Notifications/messages
- Billing
- Platform settings
- Branding
- Audit logs

Super Admin APIs:

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

GET/POST/PATCH/DELETE /api/users?role=ADMIN
GET/POST/PATCH/DELETE /api/users?role=TRAINER
GET/POST/PATCH/DELETE /api/users?role=LEARNER

GET/POST/PATCH/DELETE /api/courses
GET/POST/PATCH/DELETE /api/categories
GET/POST/PATCH/DELETE /api/modules
GET/POST/PATCH/DELETE /api/enrollments
POST                  /api/enrollments/renew
GET/POST/PATCH/DELETE /api/assessments
GET                   /api/results
GET/POST/PATCH/DELETE /api/certificates
GET/POST              /api/reports
GET/POST/PATCH        /api/notifications
GET/POST/PATCH        /api/messages
GET/POST/PATCH        /api/billing
GET                   /api/audit-logs
```

## 4. Admin

Admin starts with the operational setup:

```text
Create Category
      ↓
Create Course
      ↓
Create Modules
      ↓
Assign Trainer
      ↓
Create/Import Learners
      ↓
Create Enrollment
      ↓
Start Date + Validity
      ↓
Learner receives access
```

Admin then monitors:

```text
Progress → Results → Certificates → Reports
             │
             └── Expiry → Extension/Renewal
```

Admin must not receive billing/platform/branding/audit controls unless the backend explicitly grants those permissions.

## 5. Trainer

Trainer login:

```text
GET /api/auth/me
        ↓
role = TRAINER
        ↓
GET /api/trainer/courses
        ↓
select assigned course
        ↓
GET /api/modules?courseId=...
        ↓
create content / assessment
```

Content flow:

```text
Course
 ↓
Module
 ↓
Lesson / Topic
 ↓
VIDEO / PDF / PPT
 ↓
Upload
 ↓
Metadata
 ↓
Preview
 ↓
Save Draft / Publish
```

Video flow:

```text
Trainer
 ↓
Cloudflare Stream
 ↓
Video ID
 ↓
MongoDB metadata
```

Learner playback must be authorized by the backend using enrollment + validity checks.

## 6. Learner

```text
Login
 ↓
Active enrollments
 ↓
My Courses
 ↓
Course overview
 ↓
Pre Assessment
 ↓
Course content
 ├── Video
 ├── PDF
 └── PPT
 ↓
Progress / Resume
 ↓
Post Assessment
 ↓
Server-side grading
 ↓
Result
 ↓
Pre vs Post improvement
 ↓
Completion
 ↓
Certificate
```

Expired enrollment:

```text
Learner request
 ↓
authenticate
 ↓
learner role
 ↓
enrollment exists?
 ↓
correct course?
 ↓
status active?
 ↓
start date reached?
 ↓
expiry not passed?
 ↓
ALLOW
```

If any required check fails, deny access.

## 7. API response expectations

List endpoints should support pagination/filtering:

```http
GET /api/courses?page=1&pageSize=10&status=PUBLISHED&search=jee
GET /api/users?role=LEARNER&page=1&pageSize=10&search=aarav
GET /api/enrollments?page=1&pageSize=10&status=ACTIVE
GET /api/results?page=1&pageSize=10&courseId=...
```

Recommended response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 120,
    "totalPages": 12
  }
}
```

Errors should expose a safe message and machine-readable code:

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "You are not allowed to perform this action."
}
```

## 8. Security rules

Never trust these values from the frontend:

- role
- learnerId
- trainerId
- courseId
- score
- isCorrect
- completion percentage

The server must calculate/verify them.

For assessments:

```text
Learner submits answers
 ↓
Server loads assessment/question
 ↓
Server determines correct answers
 ↓
Server calculates marks
 ↓
Server stores attempt/result
```

For trainer access:

```text
JWT
 ↓
TRAINER
 ↓
trainer assignment for course
 ↓
allow content/assessment operation
```

For learner content:

```text
JWT
 ↓
LEARNER
 ↓
active enrollment
 ↓
valid dates
 ↓
allow content/playback
```
