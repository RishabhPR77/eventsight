const express=require("express")
const { registerOrganizer, registerSponsor, login, logout, refreshAccessToken, changePassword, getCurrentUser, verifyOtp, forgetPassword, resetPassword, resendVerificationOtp, deleteAccount, updateProfile } = require("../controllers/auth.controller.js")
const { verifyJwt } = require("../middleware/auth.middleware.js")
const { authLimiter, emailLimiter, emailChangeLimiter } = require("../middleware/rateLimit.middleware.js")
const { validateBody } = require("../middleware/validate.middleware.js")
const { registerSchema, loginSchema, emailSchema, verifyOtpSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } = require("../validators/auth.validators.js")

const authRoute=express.Router()

authRoute.post("/register/sponsor",emailLimiter,validateBody(registerSchema),registerSponsor)
authRoute.post("/register/organizer",emailLimiter,validateBody(registerSchema),registerOrganizer)
authRoute.post("/login",authLimiter,validateBody(loginSchema),login)
authRoute.post("/logout",verifyJwt,logout)
authRoute.post("/refreshToken",refreshAccessToken)
authRoute.post("/changePassword",verifyJwt,authLimiter,validateBody(changePasswordSchema),changePassword)
authRoute.get("/Current-user",verifyJwt,getCurrentUser)
authRoute.post("/verify-otp",authLimiter,validateBody(verifyOtpSchema),verifyOtp)
authRoute.post("/forget-password",emailLimiter,validateBody(emailSchema),forgetPassword)
authRoute.post("/reset-password",authLimiter,validateBody(resetPasswordSchema),resetPassword)
authRoute.post("/resend-otp",emailLimiter,validateBody(emailSchema),resendVerificationOtp)
authRoute.delete("/delete-account",verifyJwt,deleteAccount)
authRoute.patch("/update-profile",verifyJwt,emailChangeLimiter,validateBody(updateProfileSchema),updateProfile)

module.exports={authRoute}
