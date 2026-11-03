const { ApiError } = require("../utility/ApiError");
const { asyncHandler } = require("../utility/AsyncHandler");
const { mlFailure, postToMl } = require("../utility/mlClient");

const forwardToMl = (path) => asyncHandler(async (req, res) => {
    let response
    try {
        response = await postToMl(path, req.body)
    } catch (error) {
        // input errors from the ML service are the caller's to fix
        if (error.response?.status === 422) {
            throw new ApiError(422, "Invalid prediction input")
        }
        throw mlFailure(error, path)
    }
    return res.status(200).json(response.data)
})

const analyzeBrandPreview = forwardToMl("/analyze-brand")
const predictPreview = forwardToMl("/predict")

module.exports = { analyzeBrandPreview, predictPreview }
