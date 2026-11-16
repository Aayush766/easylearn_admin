import { apiClient } from "./api";
import { config } from "../data";
import { readEntity, writeEntity } from "./localStore";

const endpointFor = (page) => ({
  courses: "/api/courses", categories: "/api/categories", modules: "/api/modules",
  learners: "/api/users", trainers: "/api/users", admins: "/api/users",
  enrollments: "/api/enrollments", renewals: "/api/enrollments", assessments: "/api/assessments",
  results: "/api/attempts", certificates: "/api/admin/certificates", billing: "/api/admin/billing/invoices",
  "audit-logs": "/api/admin/audit-logs",
})[page];
export const hasBackendRecords = (page) => Boolean(endpointFor(page) || page === "trainer-assignment");

function unwrap(response) { return response?.data?.data ?? {}; }
function dateOnly(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function idOf(value) {
  return value && typeof value === "object" ? value._id || value.id : value;
}
function formatLastLogin(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
async function fetchRows(endpoint, params = {}) {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const data = unwrap(await apiClient.get(endpoint, { params: { ...params, page, limit: 100 } }));
    rows.push(...(data.items || data.courses || data.users || data.enrollments || data.assessments || data.certificates || []));
    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  }
  return rows;
}
async function cacheReference(page, endpoint, params = {}) {
  const rows = await fetchRows(endpoint, params);
  const records = normalize(page, rows);
  writeEntity(page, records);
  return records;
}
function normalize(page, rows) {
  return rows.map((row) => {
    const category = row.categoryId && typeof row.categoryId === "object" ? row.categoryId : null;
    const course = row.courseId && typeof row.courseId === "object" ? row.courseId : null;
    const learner = row.learnerId && typeof row.learnerId === "object" ? row.learnerId : null;
    const trainers = Array.isArray(row.trainerIds) ? row.trainerIds : [];
    return { ...row, id: row._id || row.id,
      lastLogin: formatLastLogin(row.lastLogin ?? row.lastLoginAt ?? row.last_login ?? row.last_login_at),
      category: category?.name || row.category || "",
      categoryId: category?._id || row.categoryId,
      course: course?.title || row.course || "",
      courseId: course?._id || row.courseId,
      learner: learner?.name || row.learner || "",
      learnerId: learner?._id || row.learnerId,
      actor: row.actorId && typeof row.actorId === "object" ? row.actorId.name || "" : row.actor || "",
      description: row.metadata?.title || row.metadata?.courseTitle || row.metadata?.recipientCount ? `${row.metadata?.title || row.metadata?.courseTitle || ""}${row.metadata?.recipientCount ? ` · ${row.metadata.recipientCount} recipients` : ""}`.trim() : row.description || "",
      trainer: trainers.map((trainer) => typeof trainer === "object" ? trainer.name : "").filter(Boolean).join(", ") || row.trainer || "",
      trainerIds: trainers.map((trainer) => typeof trainer === "object" ? trainer._id : trainer),
      startDate: row.startDate ? new Date(row.startDate).toISOString().slice(0, 10) : row.startDate,
      expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : row.expiryDate,
      date: row.date ? dateOnly(row.date) : row.date,
      totalMarks: row.totalMarks, duration: row.durationMinutes,
    };
  });
}

export function makeSlug(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export async function fetchBackendRecords(page) {
  const dependencies = {
    courses: [["categories", "/api/categories"], ["trainers", "/api/users", { role: "TRAINER" }]],
    categories: [["courses", "/api/courses"], ["enrollments", "/api/enrollments"]],
    learners: [["enrollments", "/api/enrollments"]],
    trainers: [["courses", "/api/courses"], ["enrollments", "/api/enrollments"]],
    modules: [["courses", "/api/courses"]],
    enrollments: [["learners", "/api/users", { role: "LEARNER" }], ["courses", "/api/courses"]],
    renewals: [["learners", "/api/users", { role: "LEARNER" }], ["courses", "/api/courses"], ["enrollments", "/api/enrollments"]],
    assessments: [["courses", "/api/courses"], ["modules", "/api/modules"]],
    certificates: [["courses", "/api/courses"], ["learners", "/api/users", { role: "LEARNER" }], ["enrollments", "/api/enrollments"]],
    "trainer-assignment": [["trainers", "/api/users", { role: "TRAINER" }], ["courses", "/api/courses"], ["enrollments", "/api/enrollments"]],
  }[page] || [];
  await Promise.all(dependencies.map(([key, endpoint, params]) => cacheReference(key, endpoint, params)));
  const enrollments = readEntity("enrollments");
  const courses = readEntity("courses");
  const courseById = new Map(courses.map(course => [String(course.id), course]));
  if (page === "trainer-assignment") {
    const trainersById = new Map(readEntity("trainers").map(trainer => [String(trainer.id), trainer]));
    const assignments = courses.flatMap(course => (course.trainerIds || []).map(trainerId => {
      const trainer = trainersById.get(String(idOf(trainerId)));
      const history = (course.trainerAssignments || []).find(item => String(idOf(item.trainerId)) === String(idOf(trainerId)));
      const courseEnrollments = enrollments.filter(enrollment => String(enrollment.courseId) === String(course.id) && enrollment.status === "ACTIVE");
      return {
        id: `${course.id}-${idOf(trainerId)}`,
        courseId: course.id,
        course: course.title,
        trainerId: idOf(trainerId),
        trainer: trainer?.name || "",
        assignedAt: dateOnly(history?.assignedAt),
        learnerCount: new Set(courseEnrollments.map(enrollment => String(enrollment.learnerId))).size,
        status: "ACTIVE",
      };
    }));
    writeEntity("trainer-assignment", assignments);
    return assignments;
  }
  const endpoint = endpointFor(page);
  if (!endpoint) return [];
  const params = { ...(config[page]?.query || {}), limit: 100 };
  const records = await fetchRows(endpoint, params);
  if (page === "renewals") {
    const renewalRecords = await Promise.all(records.filter(row => row.previousEnrollmentId).map(async row => {
      const previousId = typeof row.previousEnrollmentId === "object" ? row.previousEnrollmentId._id : row.previousEnrollmentId;
      let previous = typeof row.previousEnrollmentId === "object" ? row.previousEnrollmentId : null;
      if (!previous?.expiryDate && previousId) {
        try { previous = unwrap(await apiClient.get(`/api/enrollments/${encodeURIComponent(previousId)}`)).enrollment; }
        catch { previous = null; }
      }
      return {
        ...row,
        currentExpiry: dateOnly(previous?.expiryDate),
        newStartDate: dateOnly(row.startDate),
        newExpiryDate: dateOnly(row.expiryDate),
      };
    }));
    const normalizedRenewals = normalize(page, renewalRecords);
    writeEntity(page, normalizedRenewals);
    return normalizedRenewals;
  }
  let normalized = normalize(page, records);
  if (page === "learners") {
    normalized = normalized.map(learner => {
      const mine = enrollments.filter(enrollment => String(enrollment.learnerId) === String(learner.id));
      const active = mine.filter(enrollment => enrollment.status === "ACTIVE");
      const latestExpiry = [...mine].sort((a, b) => String(b.expiryDate || "").localeCompare(String(a.expiryDate || "")))[0]?.expiryDate || "";
      return { ...learner, courses: new Set(mine.map(enrollment => String(enrollment.courseId)).filter(Boolean)).size, activeEnrollments: active.length, expiry: latestExpiry };
    });
  } else if (page === "trainers") {
    normalized = normalized.map(trainer => {
      const assignedCourses = courses.filter(course => (course.trainerIds || []).some(id => String(idOf(id)) === String(trainer.id)));
      const assignedCourseIds = new Set(assignedCourses.map(course => String(course.id)));
      const activeLearners = enrollments.filter(enrollment => assignedCourseIds.has(String(enrollment.courseId)) && enrollment.status === "ACTIVE");
      return {
        ...trainer,
        specialization: trainer.specialization || trainer.profile?.specialization || "",
        courses: assignedCourseIds.size,
        learners: new Set(activeLearners.map(enrollment => String(enrollment.learnerId))).size,
      };
    });
  } else if (page === "categories") {
    normalized = normalized.map(category => {
      const categoryCourses = courses.filter(course => String(course.categoryId) === String(category.id));
      const categoryCourseIds = new Set(categoryCourses.map(course => String(course.id)));
      const activeLearners = enrollments.filter(enrollment => categoryCourseIds.has(String(enrollment.courseId)) && enrollment.status === "ACTIVE");
      return { ...category, courseCount: categoryCourses.length, learnerCount: new Set(activeLearners.map(enrollment => String(enrollment.learnerId))).size };
    });
  } else if (page === "enrollments") {
    normalized = normalized.map(enrollment => ({ ...enrollment, trainer: courseById.get(String(enrollment.courseId))?.trainer || "" }));
  }
  writeEntity(page, normalized);
  return normalized;
}

function payloadFor(page, values) {
  const body = { ...values };
  delete body.id;
  if (page !== "modules") delete body.order;
  if (page === "courses") {
    if (!/^[a-f\d]{24}$/i.test(String(body.categoryId || ""))) {
      throw new Error("Select a category created on the server before saving this course.");
    }
    body.slug = body.slug || body.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (body.thumbnailData) { body.thumbnail = typeof body.thumbnailData === "string" ? { url: body.thumbnailData } : body.thumbnailData; delete body.thumbnailData; }
  }
  if (page === "categories") {
    body.slug = makeSlug(body.slug || body.name);
    if (!body.slug) throw new Error("Enter a category name that can be used to make a slug.");
  }
  if (page === "learners") body.role = "LEARNER";
  if (page === "trainers") body.role = "TRAINER";
  if (page === "admins") body.role = "ADMIN";
  if (page === "enrollments") { body.source = body.source === "RENEWAL" ? "ADMIN" : "ADMIN"; delete body.status; delete body.notes; }
  if (page === "assessments") { body.durationMinutes = Number(body.duration || 0) || undefined; delete body.duration; body.availableFrom = body.startDate || undefined; body.availableUntil = body.endDate || undefined; delete body.startDate; delete body.endDate; }
  if (page === "billing" && body.date) body.date = new Date(`${body.date}T00:00:00`).toISOString();
  return body;
}
export async function saveBackendRecord(page, values, id) {
  const body = payloadFor(page, values);
  if (page === "trainer-assignment") {
    const courseIds = Array.isArray(values.courseId) ? values.courseId : [values.courseId].filter(Boolean);
    await Promise.all(courseIds.map((courseId) => apiClient.post(`/api/courses/${courseId}/trainers`, {
      trainerId: values.trainerId,
      assignedAt: values.assignedAt || undefined,
    })));
    return;
  }
  if (page === "renewals") {
    const { enrollmentId, newStartDate, newExpiryDate } = values;
    if (!newStartDate || !newExpiryDate || new Date(newExpiryDate) <= new Date(newStartDate)) {
      throw new Error("Enter an end date that is after the start date.");
    }
    return unwrap(await apiClient.post(`/api/enrollments/${encodeURIComponent(enrollmentId)}/renew`, { startDate: newStartDate, expiryDate: newExpiryDate }));
  }
  if (page === "enrollments" && !id) {
    const courseIds = Array.isArray(values.courseId) ? values.courseId : [values.courseId].filter(Boolean);
    const { courseId, ...rest } = body;
    await Promise.all(courseIds.map((selectedCourseId) => apiClient.post("/api/enrollments", { ...rest, courseId: selectedCourseId })));
    return;
  }
  const endpoint = endpointFor(page);
  if (!endpoint) return;
  if (id) return unwrap(await apiClient.patch(`${endpoint}/${encodeURIComponent(id)}`, body));
  return unwrap(await apiClient.post(endpoint, body));
}
export async function deleteBackendRecord(page, row) {
  if (page === "trainer-assignment") {
    return unwrap(await apiClient.delete(`/api/courses/${encodeURIComponent(row.courseId)}/trainers/${encodeURIComponent(row.trainerId)}`));
  }
  const endpoint = endpointFor(page);
  if (["courses", "categories", "modules", "learners", "trainers", "admins", "enrollments", "assessments", "certificates", "billing"].includes(page)) {
    return unwrap(await apiClient.delete(`${endpoint}/${encodeURIComponent(row.id)}`));
  }
  throw new Error("This record cannot be deleted by the server.");
}
