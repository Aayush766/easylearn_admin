import { apiClient } from "./api";
export async function login(email, password, role, secondFactor) {
  const body = secondFactor
    ? { challengeToken: secondFactor.challengeToken, twoFactorCode: secondFactor.code, role }
    : { email, password, role };
  const response = await apiClient.post("/api/auth/login", body);
  const payload = response.data?.data ?? response.data;
  if (payload?.accessToken) window.__PEL_ACCESS_TOKEN__ = payload.accessToken;
  return payload;
}
export async function refresh() {
  try {
    const response = await apiClient.post("/api/auth/refresh");
    const payload = response.data?.data ?? response.data;
    if (payload?.accessToken) window.__PEL_ACCESS_TOKEN__ = payload.accessToken;
    return payload;
  } catch (error) {
    // Don't keep sending a stale access token after the refresh cookie is
    // rejected; the next successful login will install a fresh one.
    delete window.__PEL_ACCESS_TOKEN__;
    throw error;
  }
}
export async function logout() { try { await apiClient.post("/api/auth/logout"); } finally { delete window.__PEL_ACCESS_TOKEN__; } }
export async function me() { const response = await apiClient.get("/api/auth/me"); return response.data?.data ?? response.data; }
