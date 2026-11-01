const { ApiError } = require("../utility/ApiError");

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const isTrustedOrigin = (origin) => !origin || origin === process.env.CLIENT_ORIGIN;

// Production cookies are SameSite=None, so any website could make a browser send
// them. Browsers always attach Origin to those requests, so reject the foreign ones.
const requireTrustedOrigin = (req, res, next) => {
    if (SAFE_METHODS.includes(req.method) || isTrustedOrigin(req.headers.origin)) {
        return next();
    }
    next(new ApiError(403, "This request isn't allowed from another website"));
};

module.exports = { isTrustedOrigin, requireTrustedOrigin };
