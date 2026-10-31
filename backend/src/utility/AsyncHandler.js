const { toHttpError } = require("./httpError");

const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        const { statusCode, message } = toHttpError(err);
        if (statusCode >= 500) {
            console.error("BACKEND ERROR:", err);
        }

        return res.status(statusCode).json({
            success: false,
            message: message
        });
    }
};

module.exports = { asyncHandler };
