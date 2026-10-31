const axios = require("axios");

// Long enough for a sleeping free-tier ML service to wake (about a minute)
// and then finish /predict, which makes two Groq calls of up to 10s each
const ML_TIMEOUT_MS = 90000;

const postToMl = (path, payload) =>
  axios.post(`${process.env.ML_API_URL}${path}`, payload, {
    timeout: ML_TIMEOUT_MS,
    headers: {
      "x-api-key": process.env.ML_API_KEY,
      "Content-Type": "application/json",
    },
  });

module.exports = { postToMl };
