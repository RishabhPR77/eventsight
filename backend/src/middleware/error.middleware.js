const { toHttpError } = require("../utility/httpError");

const notFound = (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
};

// Catches what asyncHandler can't: body parsing, multer, and sync middleware errors
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const { statusCode, message } = toHttpError(err);
    if (statusCode >= 500) {
        console.error("BACKEND ERROR:", err);
    }

    res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
