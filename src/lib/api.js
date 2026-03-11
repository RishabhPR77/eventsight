import axios from "axios";

// 1. Get the base URL
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// 2. Get the Secret API Key strictly from the hidden .env file (NO hardcoded fallback!)
export const API_KEY = import.meta.env.VITE_SERVICE_API_KEY;

// 3. Bake the key into every Axios request automatically
export const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
  }
});

export async function analyzeBrand(payload) {
  const { data } = await api.post("/analyze-brand", payload);
  return data;
}

export async function predictDeal(payload) {
  const { data } = await api.post("/predict", payload);
  return data;
}