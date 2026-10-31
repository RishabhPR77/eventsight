const REQUIRED = [
    "DATABASE_URI",
    "ACCESS_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_SECRET",
    "REFRESH_TOKEN_EXPIRY",
    "CLIENT_ORIGIN",
    "ML_API_URL",
    "ML_API_KEY",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD"
]

const REQUIRED_IN_PRODUCTION = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "BREVO_API_KEY",
    "EMAIL_FROM"
]

const MIN_SECRET_LENGTH = 32

// Stop at boot with a clear message instead of failing later on a live request
const validateEnv = () => {
    const isProduction = process.env.NODE_ENV === "production"
    const required = isProduction ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION] : REQUIRED

    const problems = required
        .filter((name) => !process.env[name])
        .map((name) => `${name} is not set`)

    if (isProduction) {
        for (const name of ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]) {
            if (process.env[name] && process.env[name].length < MIN_SECRET_LENGTH) {
                problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters`)
            }
        }
    }

    if (problems.length) {
        console.error(`Invalid environment:\n- ${problems.join("\n- ")}`)
        process.exit(1)
    }
}

module.exports = { validateEnv }
