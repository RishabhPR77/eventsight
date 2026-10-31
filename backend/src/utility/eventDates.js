// Event dates are calendar days saved as midnight UTC, which is 5:30 AM in India.
// An event stays open until its day ends in India (UTC+5:30), 18.5 hours later.
const INDIA_DAY_END_MS = 18.5 * 60 * 60 * 1000;

// Events dated before this have finished; events on or after it are still open
const eventCutoff = () => new Date(Date.now() - INDIA_DAY_END_MS);

module.exports = { eventCutoff };
