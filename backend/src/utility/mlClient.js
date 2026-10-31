const axios = require("axios");

// /predict makes two Groq calls of up to 10s each, plus model time
const ML_TIMEOUT_MS = 30000;

const postToMl = (path, payload) =>
  axios.post(`${process.env.ML_API_URL}${path}`, payload, {
    timeout: ML_TIMEOUT_MS,
    headers: {
      "x-api-key": process.env.ML_API_KEY,
      "Content-Type": "application/json",
    },
  });

module.exports = { postToMl };
