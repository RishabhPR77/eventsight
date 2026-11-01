import axios from "axios";

// Node backend base URL (the app talks only to this; it holds the ML API key)
const rawBase = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080/api";
export const BACKEND_BASE = rawBase.endsWith("/") ? rawBase : rawBase + "/";

// Free hosting sleeps, so a prediction can include the ML service waking up
const ML_TIMEOUT_MS = 130000;

export const SOCKET_URL = BACKEND_BASE.replace(/\/api\/?$/, "");

// Free hosting sleeps when idle and takes about a minute to wake
const DEFAULT_TIMEOUT_MS = 70000;

export const backend = axios.create({
  baseURL: BACKEND_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
});

// Separate instance for admin (uses adminToken cookie, no user session refresh)
export const adminApi = axios.create({
  baseURL: BACKEND_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
});

// ─────────────────────────────
// Slow requests (server waking up)
// ─────────────────────────────

const SLOW_REQUEST_MS = 6000;
let slowRequests = 0;
const slowListeners = new Set();

const setSlowRequests = (count) => {
  slowRequests = count;
  slowListeners.forEach((listener) => listener(slowRequests > 0));
};

export function subscribeSlowRequests(listener) {
  slowListeners.add(listener);
  return () => slowListeners.delete(listener);
}

const settleSlowTimer = (config) => {
  if (!config) return;
  clearTimeout(config.slowTimer);
  if (config.markedSlow) {
    config.markedSlow = false;
    setSlowRequests(slowRequests - 1);
  }
};

const trackSlowRequests = (instance) => {
  instance.interceptors.request.use((config) => {
    config.slowTimer = setTimeout(() => {
      config.markedSlow = true;
      setSlowRequests(slowRequests + 1);
    }, SLOW_REQUEST_MS);
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      settleSlowTimer(response.config);
      return response;
    },
    (error) => {
      settleSlowTimer(error.config);
      return Promise.reject(error);
    }
  );
};

trackSlowRequests(backend);
trackSlowRequests(adminApi);

// ─────────────────────────────
// Session refresh
// ─────────────────────────────

const NO_REFRESH_URLS = ["auth/login", "auth/refreshToken"];
let refreshInFlight = null;
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Access tokens are short-lived: renew once and replay the request
backend.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error;
  if (response?.status !== 401 || !config || config.sessionRetried || NO_REFRESH_URLS.includes(config.url)) {
    return Promise.reject(error);
  }

  config.sessionRetried = true;
  refreshInFlight ??= backend.post("auth/refreshToken").finally(() => {
    refreshInFlight = null;
  });

  try {
    await refreshInFlight;
  } catch {
    onSessionExpired();
    return Promise.reject(error);
  }
  return backend(config);
});

// ─────────────────────────────
// ML calls via backend (playground)
// ─────────────────────────────

export async function analyzeBrand(payload) {
  const { data } = await backend.post("ml/analyze-brand", payload, { timeout: ML_TIMEOUT_MS });
  return data;
}

export async function predictDeal(payload) {
  const { data } = await backend.post("ml/predict", payload, { timeout: ML_TIMEOUT_MS });
  return data;
}

// ─────────────────────────────
// Admin — master data
// ─────────────────────────────

export async function fetchEventCategories() {
  const { data } = await backend.get("admin/categories");
  return data?.data || [];
}

export async function fetchBrandTypes() {
  const { data } = await backend.get("admin/brandTypes");
  return data?.data || [];
}

export async function createEventCategory(payload) {
  const { data } = await adminApi.post("admin/createCategory", payload);
  return data;
}

export async function createBrandType(payload) {
  const { data } = await adminApi.post("admin/createBrandType", payload);
  return data;
}

export async function fetchCities() {
  const { data } = await backend.get("admin/cities");
  return data?.data || [];
}

export async function createCity(payload) {
  const { data } = await adminApi.post("admin/createCity", payload);
  return data;
}

export async function deleteCity(id) {
  const { data } = await adminApi.delete(`admin/cities/${id}`);
  return data;
}

// ─────────────────────────────
// Auth routes
// ─────────────────────────────

export async function registerSponsor(payload) {
  const { data } = await backend.post("auth/register/sponsor", payload);
  return data;
}

export async function registerOrganizer(payload) {
  const { data } = await backend.post("auth/register/organizer", payload);
  return data;
}

export async function login(payload) {
  const { data } = await backend.post("auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await backend.post("auth/logout");
  return data;
}

export async function refreshToken() {
  const { data } = await backend.post("auth/refreshToken");
  return data;
}

export async function changePassword(payload) {
  const { data } = await backend.post("auth/changePassword", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await backend.get("auth/Current-user");
  return data;
}

export async function verifyOtp(payload) {
  const { data } = await backend.post("auth/verify-otp", payload);
  return data;
}

export async function forgetPassword(payload) {
  const { data } = await backend.post("auth/forget-password", payload);
  return data;
}

export async function resetPassword(payload) {
  const { data } = await backend.post("auth/reset-password", payload);
  return data;
}

export async function resendOtp(payload) {
  const { data } = await backend.post("auth/resend-otp", payload);
  return data;
}

export async function deleteAccount() {
  const { data } = await backend.delete("auth/delete-account");
  return data;
}

export async function updateProfile(payload) {
  const { data } = await backend.patch("auth/update-profile", payload);
  return data;
}

// ─────────────────────────────
// Organizer routes
// ─────────────────────────────

export async function createEvent(formData) {
  const { data } = await backend.post("organizer/events", formData);
  return data;
}

export async function getOrganizerEvents(params = {}) {
  const { data } = await backend.get("organizer/events", { params });
  return data;
}

export async function getOrganizerEventById(eventId) {
  const { data } = await backend.get(`organizer/events/${eventId}`);
  return data;
}

export async function updateEvent(eventId, formData) {
  const { data } = await backend.patch(`organizer/events/${eventId}`, formData);
  return data;
}

export async function deleteEvent(eventId) {
  const { data } = await backend.delete(`organizer/events/${eventId}`);
  return data;
}

export async function getEventApplications(eventId) {
  const { data } = await backend.get(`organizer/events/${eventId}/applications`);
  return data;
}

export async function updateApplicationStatus(eventId, applicationId, status) {
  const { data } = await backend.patch(`organizer/events/${eventId}/applications/${applicationId}`, { status });
  return data;
}

// ─────────────────────────────
// Sponsor routes
// ─────────────────────────────

export async function createSponsorProfile(formData) {
  const { data } = await backend.post("sponsor/profileCreate", formData);
  return data;
}

export async function getSponsorProfile() {
  const { data } = await backend.get("sponsor/profileFetch");
  return data;
}

export async function updateSponsorProfile(formData) {
  const { data } = await backend.patch("sponsor/profileUpdate", formData);
  return data;
}

export async function deleteSponsorProfile() {
  const { data } = await backend.delete("sponsor/profileDelete");
  return data;
}

export async function getSponsorEvents(params = {}) {
  const { data } = await backend.get("sponsor/events", { params });
  return data;
}

export async function getSponsorEventById(id) {
  const { data } = await backend.get(`sponsor/events/${id}`);
  return data;
}

export async function giveEventFeedback(eventId, payload) {
  const { data } = await backend.post(`sponsor/events/${eventId}/feedback`, payload);
  return data;
}

export async function getMyEventFeedback(eventId) {
  const { data } = await backend.get(`sponsor/events/${eventId}/feedback`);
  return data;
}

export async function updateEventFeedback(eventId, payload) {
  const { data } = await backend.patch(`sponsor/events/${eventId}/feedback`, payload);
  return data;
}

// Backend → ML prediction chain
export async function getEventPrediction(eventId) {
  const { data } = await backend.get(`sponsor/predict/${eventId}`, { timeout: ML_TIMEOUT_MS });
  return data;
}

export async function withdrawApplication(eventId) {
  const { data } = await backend.post(`sponsor/events/${eventId}/application/withdraw`);
  return data;
}

export async function getOrganizerHistory() {
  const { data } = await backend.get("organizer/history");
  return data;
}

export async function getSponsorHistory() {
  const { data } = await backend.get("sponsor/history");
  return data;
}

export async function getOrganizerApplications() {
  const { data } = await backend.get("organizer/applications");
  return data;
}

export async function counterAsSponsor(eventId, offer) {
  const { data } = await backend.post(`sponsor/events/${eventId}/application/counter`, offer);
  return data;
}

export async function counterAsOrganizer(eventId, applicationId, offer) {
  const { data } = await backend.post(`organizer/events/${eventId}/applications/${applicationId}/counter`, offer);
  return data;
}

export async function acceptOfferAsSponsor(eventId) {
  const { data } = await backend.post(`sponsor/events/${eventId}/application/accept`);
  return data;
}

export async function getNotifications() {
  const { data } = await backend.get("notifications");
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await backend.post(`notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await backend.post("notifications/read-all");
  return data;
}

export async function getConversations() {
  const { data } = await backend.get("chat/conversations");
  return data;
}

export async function getConversation(id) {
  const { data } = await backend.get(`chat/conversations/${id}`);
  return data;
}

export async function markConversationRead(id) {
  const { data } = await backend.post(`chat/conversations/${id}/read`);
  return data;
}

export async function sendAttachment(conversationId, file, text) {
  const form = new FormData();
  form.append("text", text);
  form.append("file", file);
  const { data } = await backend.post(`chat/conversations/${conversationId}/attachments`, form);
  return data;
}

export async function startConversation(payload) {
  const { data } = await backend.post("chat/conversation", payload);
  return data;
}

export async function getConversationMessages(conversationId) {
  const { data } = await backend.get(`chat/messages/${conversationId}`);
  return data;
}

export async function getEventConversations(eventId) {
  const { data } = await backend.get(`chat/event/${eventId}`);
  return data;
}

export async function confirmSponsorship(eventId) {
  const { data } = await backend.post(`sponsor/events/${eventId}/application/confirm`);
  return data;
}

export async function confirmSponsorshipAsOrganizer(eventId, applicationId, activationMaturity) {
  const { data } = await backend.post(`organizer/events/${eventId}/applications/${applicationId}/confirm`, { activationMaturity });
  return data;
}

// Sponsor — completed events (for feedback board)
export async function getSponsorCompletedEvents(params = {}) {
  const { data } = await backend.get("sponsor/completed-events", { params });
  return data;
}

// Sponsor — sponsorship applications
export async function applyToEvent(eventId, payload) {
  const { data } = await backend.post(`sponsor/events/${eventId}/application`, payload);
  return data;
}

export async function getMyEventApplication(eventId) {
  const { data } = await backend.get(`sponsor/events/${eventId}/application`);
  return data;
}

export async function getMyApplications() {
  const { data } = await backend.get("sponsor/applications");
  return data;
}

// ─────────────────────────────
// Admin routes
// ─────────────────────────────

export async function adminLogin(payload) {
  const { data } = await adminApi.post("admin/login", payload);
  return data;
}

export async function adminLogout() {
  const { data } = await adminApi.post("admin/logout");
  return data;
}

export async function getAdminStats() {
  const { data } = await adminApi.get("admin/stats");
  return data;
}

export async function getAdminUsers(params = {}) {
  const { data } = await adminApi.get("admin/users", { params });
  return data;
}

export async function deleteAdminUser(id) {
  const { data } = await adminApi.delete(`admin/users/${id}`);
  return data;
}

export async function getAdminEvents(params = {}) {
  const { data } = await adminApi.get("admin/events", { params });
  return data;
}

export async function deleteAdminEvent(id) {
  const { data } = await adminApi.delete(`admin/events/${id}`);
  return data;
}

export async function deleteEventCategory(id) {
  const { data } = await adminApi.delete(`admin/categories/${id}`);
  return data;
}

export async function deleteBrandType(id) {
  const { data } = await adminApi.delete(`admin/brandTypes/${id}`);
  return data;
}