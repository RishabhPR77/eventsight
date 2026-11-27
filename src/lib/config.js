// Node backend base URL (the app talks only to this; it holds the ML API key)
const rawBase = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080/api";
export const BACKEND_BASE = rawBase.endsWith("/") ? rawBase : rawBase + "/";

export const SOCKET_URL = BACKEND_BASE.replace(/\/api\/?$/, "");
