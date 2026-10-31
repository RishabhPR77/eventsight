const { z } = require("zod");

const rating = (label) => z.number({ error: `${label} is required` })
    .min(0, `${label} must be between 0 and 1`)
    .max(1, `${label} must be between 0 and 1`);

const feedbackSchema = z.object({
    organizerReputation: rating("Organizer reputation"),
    lineupQuality: rating("Lineup quality")
});

const organizerConfirmSchema = z.object({
    activationMaturity: rating("Activation maturity")
});

module.exports = { feedbackSchema, organizerConfirmSchema };
