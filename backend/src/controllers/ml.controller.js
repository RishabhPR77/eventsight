const { ApiError } = require("../utility/ApiError");
const { asyncHandler } = require("../utility/AsyncHandler");
const { postToMl } = require("../utility/mlClient");

const forwardToMl = (path, failureMessage) => asyncHandler(async (req, res) => {
    let response
    try {
        response = await postToMl(path, req.body)
    } catch (error) {
        // input errors from the ML service are the caller's to fix
        if (error.response?.status === 422) {
            throw new ApiError(422, "Invalid prediction input")
        }
        console.log(error.response?.data || error.message);
        throw new ApiError(502, failureMessage)
    }
    return res.status(200).json(response.data)
})

const analyzeBrandPreview = forwardToMl("/analyze-brand", "Brand analysis failed")
const predictPreview = forwardToMl("/predict", "Prediction failed")

module.exports = { analyzeBrandPreview, predictPreview }
