const { ApiError } = require("../utility/ApiError");

const hasOperatorKey = (value) => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, item]) => key.startsWith("$") || hasOperatorKey(item));
};

// A JSON body like {"email": {"$gt": ""}} would otherwise act as a Mongo query
const rejectOperatorKeys = (req, res, next) => {
    if (hasOperatorKey(req.body)) {
        return next(new ApiError(400, "Invalid request body"));
    }
    next();
};

const validateBody = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
        return next(new ApiError(400, result.error.issues[0].message));
    }
    req.body = result.data;
    next();
};

module.exports = { rejectOperatorKeys, validateBody };
