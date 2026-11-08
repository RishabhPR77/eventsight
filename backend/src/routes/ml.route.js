const express = require("express");
const { verifyJwt } = require("../middleware/auth.middleware");
const { predictionLimiter } = require("../middleware/rateLimit.middleware");
const { analyzeBrandPreview, predictPreview } = require("../controllers/ml.controller");
const { wakeMl } = require("../utility/mlClient");

const mlRoute = express.Router();

// predictor playground: the ML API key stays on the server
mlRoute.post("/analyze-brand", verifyJwt, predictionLimiter, analyzeBrandPreview);
mlRoute.post("/predict", verifyJwt, predictionLimiter, predictPreview);

// Called when the site opens; answers at once and wakes the ML service in the background
mlRoute.get("/wake", (req, res) => {
    wakeMl();
    res.status(202).json({ ok: true });
});

module.exports = { mlRoute };
