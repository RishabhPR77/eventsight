const { rateLimit } = require("express-rate-limit");

const limiter = (windowMinutes, limit, message, options = {}) => rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
    ...options
});

// Password and OTP guesses
const authLimiter = limiter(15, 20, "Too many attempts. Please try again in 15 minutes.");

// Every request here sends an email, so it also protects the daily email quota
const emailLimiter = limiter(60, 10, "Too many requests. Please try again later.");

// Only a request carrying an email can send one, so the alerts switch isn't limited
const emailChangeLimiter = limiter(60, 10, "Too many requests. Please try again later.", {
    skip: (req) => req.body?.email === undefined
});

// Each prediction uses up to 3 Groq calls from a shared daily quota. Runs after
// verifyJwt, so the limit is per user rather than per IP.
const predictionLimiter = limiter(10, 20, "Prediction limit reached. Please try again in a few minutes.", {
    keyGenerator: (req) => req.user._id.toString()
});

module.exports = { authLimiter, emailLimiter, emailChangeLimiter, predictionLimiter };
