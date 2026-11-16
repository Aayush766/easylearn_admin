import { seed } from "../data";
import { USE_MOCK_API } from "./api";

const prefix = "pel-demo-";

if (!USE_MOCK_API) {
  try {
    const marker = `${prefix}real-api-cache-cleaned`;
    if (window.localStorage.getItem(marker) !== "1") {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith(`${prefix}entity-`) || ["messages", "message-replies", "notifications"].some(name => key === `${prefix}${name}`)) {
          window.localStorage.removeItem(key);
        }
      }
      window.localStorage.setItem(marker, "1");
    }
  } catch { /* storage may be unavailable */ }
}

export function readDemo(key, fallback) {
  try {
    const saved = window.localStorage.getItem(`${prefix}${key}`);
    return saved === null ? fallback : JSON.parse(saved);
  } catch {
    return fallback;
  }
}
export function writeDemo(key, value) {
  try { window.localStorage.setItem(`${prefix}${key}`, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}
export function readEntity(page) { return readDemo(`entity-${page}`, USE_MOCK_API ? seed[page] || [] : []); }
export function writeEntity(page, records) { writeDemo(`entity-${page}`, records); }
