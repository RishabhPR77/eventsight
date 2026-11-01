const express = require("express")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const dotenv = require("dotenv")
const helmet = require("helmet")
dotenv.config()

const { validateEnv } = require("./config/env.js")
validateEnv()

const { connectDb } = require("./db/db.js")

const { authRoute } = require("./routes/auth.route.js")
const { organizerRoute } = require("./routes/organizer.routes.js")
const { adminRoute } = require("./routes/admin.route.js")
const { sponsorRoute } = require("./routes/sponsor.route.js")
const { chatRoute } = require("./routes/chat.route.js")
const { mlRoute } = require("./routes/ml.route.js")
const { notificationRoute } = require("./routes/notification.route.js")
const { isTrustedOrigin, requireTrustedOrigin } = require("./middleware/origin.middleware.js")
const { rejectOperatorKeys } = require("./middleware/validate.middleware.js")
const { notFound, errorHandler } = require("./middleware/error.middleware.js")
const http = require("http")
const { Server } = require("socket.io")
const chatSocket = require("./socket/chatSocket.js")
const { startEventExpiryJob } = require("./jobs/eventExpiry.job.js")
const { startDealResolutionJob } = require("./jobs/dealResolution.job.js")

const SHUTDOWN_TIMEOUT_MS = 10000

const app = express()

// Render puts one proxy in front of the app; rate limits need the real client IP
app.set("trust proxy", 1)

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(cors({
    origin:`${process.env.CLIENT_ORIGIN}`,
    credentials:true
}))

const server = http.createServer(app)
const io = new Server(server, {
    maxHttpBufferSize: 16 * 1024,
    // WebSocket upgrades skip CORS, so foreign sites have to be turned away here
    allowRequest: (req, callback) => callback(null, isTrustedOrigin(req.headers.origin)),
    cors: {
        origin: `${process.env.CLIENT_ORIGIN}`,
        credentials: true
    }
})

chatSocket(io)


app.use(requireTrustedOrigin)
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ limit: "16kb", extended: true }))
app.use(cookieParser())
app.use(rejectOperatorKeys)

app.get("/health", (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1
    res.status(databaseReady ? 200 : 503).json({ ok: databaseReady })
})

app.use("/api/auth", authRoute)
app.use("/api/organizer", organizerRoute)
app.use("/api/admin", adminRoute)
app.use("/api/sponsor", sponsorRoute)
app.use("/api/chat", chatRoute)
app.use("/api/ml", mlRoute)
app.use("/api/notifications", notificationRoute)

app.use(notFound)
app.use(errorHandler)


const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`)
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref()

    // io.close() also closes the HTTP server
    io.close(async () => {
        await mongoose.disconnect()
        process.exit(0)
    })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason)
})


connectDb().then(() => {
    startEventExpiryJob()
    startDealResolutionJob()
    server.listen(process.env.PORT || 8000, () => {
        console.log(`app is listening on the port ${process.env.PORT || 8000} `)
    })
}).catch((err) => {
    console.error("connection error")
    process.exit(1)
})
