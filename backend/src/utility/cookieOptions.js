// The frontend and API are on different hosts in production, so cookies must be
// sent cross-site. clearCookie needs these same options to remove them.
const cookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax"
    };
};

module.exports = { cookieOptions };
