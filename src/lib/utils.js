export function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function clampNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function fmtINR(n) {
  return Math.round(clampNum(n, 0)).toLocaleString("en-IN");
}

export function rupees(n) {
  return `₹${fmtINR(n)}`;
}

export function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtTime(value) {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function fmtDayLabel(value) {
  const day = new Date(value).toDateString();
  if (day === new Date().toDateString()) return "Today";
  if (day === new Date(Date.now() - 864e5).toDateString()) return "Yesterday";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(value) {
  const minutes = Math.floor((Date.now() - new Date(value)) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Admin master data comes back upper-cased: "FOOD FESTIVAL" reads badly in a UI
export function titleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/(^|[\s/])(\w)/g, (match) => match.toUpperCase())
    .replace(/\bFmcg\b/, "FMCG");
}

export function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function coldEmailToText(coldEmail) {
  if (!coldEmail) return "";
  const parsed = parseMaybeJson(coldEmail);
  if (typeof parsed !== "object") return String(parsed);
  const subject = parsed.Subject || parsed.subject || "";
  const body = parsed.Body || parsed.body || "";
  return subject || body ? `Subject: ${subject}\n\n${body}`.trim() : JSON.stringify(parsed, null, 2);
}

export function getErrorMessage(err) {
  if (err?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (err?.code === "ERR_NETWORK") return "Can't reach the server. Check your connection and try again.";
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    "Something went wrong. Please try again."
  );
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return "";
}

export function initials(name = "") {
  return String(name).trim().slice(0, 2).toUpperCase() || "SW";
}
