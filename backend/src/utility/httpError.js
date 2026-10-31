const FILE_ERRORS = {
    LIMIT_FILE_SIZE: "Image must be 5 MB or smaller",
    LIMIT_FILE_COUNT: "Only one image can be uploaded",
    LIMIT_UNEXPECTED_FILE: "Unexpected file upload"
};

// Turns any thrown error into the status and message that are safe to send
const toHttpError = (err) => {
    if (err.code === 11000) {
        return { statusCode: 400, message: "Record already exists with this data." };
    }
    if (err.name === "MulterError") {
        return { statusCode: 400, message: FILE_ERRORS[err.code] || "File upload failed" };
    }
    if (err.name === "ValidationError") {
        const first = Object.values(err.errors || {})[0];
        return { statusCode: 400, message: first?.message || "Invalid data" };
    }
    if (err.name === "CastError") {
        return { statusCode: 400, message: "Invalid value" };
    }

    const { statusCode } = err;
    if (typeof statusCode === "number" && statusCode >= 100 && statusCode < 500) {
        return { statusCode, message: err.message };
    }

    // Internal details stay in the logs in production
    const message = process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message || "Internal server error";
    return { statusCode: typeof statusCode === "number" ? statusCode : 500, message };
};

module.exports = { toHttpError };
