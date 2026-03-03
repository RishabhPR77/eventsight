const express=require("express")
const { registerOrganizer, registerSponsor, login, logout, refreshAccessToken, changePassword, getCurrentUser, verifyOtp, forgetPassword, resetPassword, resendVerificationOtp, deleteAccount, updateProfile } = require("../controllers/auth.controller.js")
const { verifyJwt } = require("../middleware/auth.middleware.js")

const authRoute=express.Router()

authRoute.post("/register/sponsor",registerSponsor)
authRoute.post("/register/organizer",registerOrganizer)
authRoute.post("/login",login)
authRoute.post("/logout",verifyJwt,logout)
authRoute.post("/refreshToken",refreshAccessToken)
authRoute.post("/changePassword",verifyJwt,changePassword)
authRoute.get("/Current-user",verifyJwt,getCurrentUser)
authRoute.post("/verify-otp",verifyOtp)
authRoute.post("/forget-password",forgetPassword)
authRoute.post("/reset-password",resetPassword)
authRoute.post("/resend-otp",resendVerificationOtp)
authRoute.delete("/delete-account",verifyJwt,deleteAccount)
authRoute.patch("/update-profile",verifyJwt,updateProfile)

module.exports={authRoute}