const express = require("express");
const { verifyJwt } = require("../middleware/auth.middleware");
const { predictionLimiter } = require("../middleware/rateLimit.middleware");
const { analyzeBrandPreview, predictPreview } = require("../controllers/ml.controller");
const { mlIsReady } = require("../utility/mlClient");

const mlRoute = express.Router();

// predictor playground: the ML API key stays on the server
mlRoute.post("/analyze-brand", verifyJwt, predictionLimiter, analyzeBrandPreview);
mlRoute.post("/predict", verifyJwt, predictionLimiter, predictPreview);

// Whether the ML service is up yet; asking also wakes it
mlRoute.get("/status", async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ ready: await mlIsReady() });
});

module.exports = { mlRoute };
