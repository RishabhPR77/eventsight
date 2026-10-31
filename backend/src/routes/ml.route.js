const express = require("express");
const { verifyJwt } = require("../middleware/auth.middleware");
const { analyzeBrandPreview, predictPreview } = require("../controllers/ml.controller");

const mlRoute = express.Router();

// predictor playground: the ML API key stays on the server
mlRoute.post("/analyze-brand", verifyJwt, analyzeBrandPreview);
mlRoute.post("/predict", verifyJwt, predictPreview);

module.exports = { mlRoute };
