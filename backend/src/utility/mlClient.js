const axios = require("axios");
const { ApiError } = require("./ApiError");

// Long enough for a sleeping free-tier ML service to wake (about a minute)
// and then finish /predict, which makes two Groq calls of up to 10s each
const ML_TIMEOUT_MS = 90000;
const RETRY_DELAY_MS = 3000;

const callMl = (path, payload) =>
  axios.post(`${process.env.ML_API_URL}${path}`, payload, {
    timeout: ML_TIMEOUT_MS,
    headers: {
      "x-api-key": process.env.ML_API_KEY,
      "Content-Type": "application/json",
    },
  });

// No answer, or Render's proxy answering while the service starts
const isWakingUp = (error) => !error.response || [502, 503, 504].includes(error.response.status);

const postToMl = async (path, payload) => {
  try {
    return await callMl(path, payload);
  } catch (error) {
    if (!isWakingUp(error)) throw error;
    console.error(`ML ${path} not ready (${error.response?.status || error.code}), retrying once`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return callMl(path, payload);
  }
};

// Logs the real reason, and gives the user a message they can act on
const mlFailure = (error, path) => {
  const status = error.response?.status;
  if (status === 401 || status === 403) {
    console.error(`ML ${path} refused the API key: ML_API_KEY must match the ML service's SERVICE_API_KEY`);
  } else {
    console.error(`ML ${path} failed (${status || error.code || "no response"}):`, JSON.stringify(error.response?.data || error.message).slice(0, 500));
  }

  const failure = new ApiError(503, "The AI service is busy or still waking up. Please try again in a minute.");
  failure.expose = true;
  return failure;
};

module.exports = { postToMl, mlFailure };
