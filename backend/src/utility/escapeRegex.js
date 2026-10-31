// User input goes into $regex as a literal string, never as a pattern.
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
