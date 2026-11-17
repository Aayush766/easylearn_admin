import axios from "axios";
import { config } from "../data";

// In production, keep API calls on the admin site's origin so browsers can
// send the HTTP-only refresh cookie. Netlify proxies /api to the backend.
// Vite's development proxy handles the same relative /api paths locally.
const baseURL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
  : "";
export const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK_API ?? "false").toLowerCase() !== "false";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

apiClient.interceptors.request.use(request => {
  // Access tokens should live in memory (or be supplied by the auth context),
  // never in localStorage/sessionStorage.
  const accessToken = window.__PEL_ACCESS_TOKEN__;
  // Refresh authenticates with the HTTP-only refresh cookie. Sending the
  // (possibly expired) access token here can make the server reject refresh
  // before it checks that cookie.
  const isRefreshRequest = request.url?.replace(/\/$/, "").endsWith("/api/auth/refresh");
  if (isRefreshRequest) {
    delete request.headers.Authorization;
  } else if (accessToken) {
    request.headers.Authorization = `Bearer ${accessToken}`;
  }
  return request;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const payload = error?.response?.data;
    const normalized = new Error(payload?.message || error.message || "Request failed.");
    normalized.status = error?.response?.status;
    normalized.code = payload?.code;
    return Promise.reject(normalized);
  }
);

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? [];
}

export async function apiList(page, query = {}) {
  const schema = config[page];
  if (!schema?.endpoint) return [];
  const response = await apiClient.get(schema.endpoint, { params: { ...(schema.query || {}), ...query } });
  return unwrap(response);
}

export async function apiCreate(page, data) {
  const schema = config[page];
  const response = await apiClient.post(schema.endpoint, data, { params: schema.query });
  return unwrap(response);
}

export async function apiUpdate(page, id, data) {
  const schema = config[page];
  const response = await apiClient.patch(`${schema.endpoint}/${encodeURIComponent(id)}`, data);
  return unwrap(response);
}

export async function apiDelete(page, id) {
  const schema = config[page];
  const response = await apiClient.delete(`${schema.endpoint}/${encodeURIComponent(id)}`);
  return unwrap(response);
}

export async function apiImport(page, records) {
  const schema = config[page];
  const response = await apiClient.post(`${schema.endpoint}/import`, { records });
  return unwrap(response);
}





















