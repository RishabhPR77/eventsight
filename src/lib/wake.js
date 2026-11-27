import { BACKEND_BASE, SOCKET_URL } from "./config";

// Free hosting puts the server and the AI service to sleep when nobody uses them,
// and each takes up to a minute to wake. This module wakes them early in the
// background, and lets a page wait for one behind the "one moment" ring.
// Plain fetch rather than axios, so these checks don't trigger the slow-request banner.

const POLL_EVERY_MS = 3000;
const GIVE_UP_AFTER_MS = 150000;
// Don't flash the ring when the answer comes back almost at once
const RING_DELAY_MS = 400;
// The AI service sleeps after 15 idle minutes, so a "ready" is trusted for less
const ML_TRUSTED_FOR_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keeps asking until check() says yes, or gives up after a couple of minutes
async function pollUntil(check) {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  while (Date.now() < deadline) {
    if (await check().catch(() => false)) return true;
    await sleep(POLL_EVERY_MS);
  }
  return false;
}

// ─────────────────────────────
// Whether a click is waiting for the AI, which shows the ring over the page
// ─────────────────────────────

let aiWaiters = 0;
const waitListeners = new Set();

const notifyWaiting = () => waitListeners.forEach((listener) => listener(aiWaiters > 0));

export function subscribeAiWaiting(listener) {
  waitListeners.add(listener);
  listener(aiWaiters > 0);
  return () => waitListeners.delete(listener);
}

async function waitWithRing(wake) {
  let shown = false;
  const timer = setTimeout(() => {
    shown = true;
    aiWaiters += 1;
    notifyWaiting();
  }, RING_DELAY_MS);
  try {
    return await wake();
  } finally {
    clearTimeout(timer);
    if (shown) {
      aiWaiters -= 1;
      notifyWaiting();
    }
  }
}

// ─────────────────────────────
// Server (Node backend)
// ─────────────────────────────

let serverAwake = false;
let serverWaking = null;

const serverAnswers = async () => {
  const response = await fetch(`${SOCKET_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(65000) });
  return response.ok;
};

// Called as soon as the site opens, so the server is usually up before anyone clicks
export function wakeServer() {
  if (serverAwake) return Promise.resolve(true);
  serverWaking ??= pollUntil(serverAnswers).then((ok) => {
    serverAwake = ok;
    serverWaking = null;
    return ok;
  });
  return serverWaking;
}

export const isServerAwake = () => serverAwake;

// ─────────────────────────────
// AI (ML service, reached through the backend)
// ─────────────────────────────

let aiAwakeUntil = 0;
let aiWaking = null;

const aiAnswers = async () => {
  const response = await fetch(`${BACKEND_BASE}ml/status`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) return false;
  const body = await response.json();
  return body?.ready === true;
};

export const markAiAwake = () => {
  aiAwakeUntil = Date.now() + ML_TRUSTED_FOR_MS;
};

// Starts the AI in the background, for example when a sponsor opens an event
export function wakeAi() {
  if (Date.now() < aiAwakeUntil) return Promise.resolve(true);
  aiWaking ??= pollUntil(aiAnswers).then((ok) => {
    if (ok) markAiAwake();
    aiWaking = null;
    return ok;
  });
  return aiWaking;
}

// Before an AI request: shows the ring until the AI is up. If it never answers,
// the request still runs and its error explains what happened.
export function ensureAi() {
  if (Date.now() < aiAwakeUntil) return Promise.resolve(true);
  return waitWithRing(wakeAi);
}
