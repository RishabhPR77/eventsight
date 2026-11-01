const { z } = require("zod");

const username = z.string({ error: "Username is required" }).trim().toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or fewer");

const email = z.string({ error: "Email is required" }).trim().toLowerCase()
    .email("Enter a valid email");

// Only new passwords are checked for length, so older accounts can still log in
const newPassword = z.string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or fewer");

const existingPassword = z.string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password must be 128 characters or fewer");

const otp = z.string({ error: "OTP is required" }).trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits");

const registerSchema = z.object({ username, email, password: newPassword });

const loginSchema = z.object({ username, password: existingPassword });

const emailSchema = z.object({ email });

const verifyOtpSchema = z.object({ email, otp });

const resetPasswordSchema = z.object({
    email,
    otp,
    newPassword,
    confirmPassword: existingPassword
});

const changePasswordSchema = z.object({
    oldPassword: existingPassword,
    newPassword,
    confirmPassword: existingPassword
});

const updateProfileSchema = z.object({
    username: username.optional(),
    email: email.optional(),
    emailAlerts: z.boolean().optional()
});

module.exports = {
    registerSchema,
    loginSchema,
    emailSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    changePasswordSchema,
    updateProfileSchema
};
