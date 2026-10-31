const mongoose = require("mongoose")
const { Organizer } = require("../models/organizer.model")
const { Sponsor } = require("../models/sponsers.model")
const { SponsorApplication } = require("../models/sponsorApplication.model")
const { ApiError } = require("../utility/ApiError")
const { ApiResponse } = require("../utility/ApiResponse")
const { asyncHandler } = require("../utility/AsyncHandler")
const { eventCutoff } = require("../utility/eventDates")

const MAX_MESSAGE_LENGTH = 1000

const requireOwnEvent = async (eventId, organizerId) => {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.findOne({
        _id: eventId,
        organizer: organizerId,
        isDeleted: false
    }).select("_id")

    if (!event) {
        throw new ApiError(404, "Event not found")
    }

    return event
}

const applyToEvent = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const amount = Number(req.body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, "Offered amount must be greater than 0")
    }

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : ""
    if (message.length > MAX_MESSAGE_LENGTH) {
        throw new ApiError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`)
    }

    const profile = await Sponsor.findOne({ sponsor: req.user._id, isDeleted: false })
    if (!profile) {
        throw new ApiError(400, "Create your brand profile before applying")
    }

    const event = await Organizer.findOne({
        _id: req.params.id,
        isDeleted: false,
        isExpired: false,
        status: "upcoming",
        date: { $gte: eventCutoff() }
    })

    if (!event) {
        throw new ApiError(404, "Event not found or no longer open for applications")
    }

    // The unique {sponsor, event} index is what enforces one application per event
    let application
    try {
        application = await SponsorApplication.create({
            sponsor: req.user._id,
            event: event._id,
            negotiations: [{ from: "sponsor", amount, message }]
        })
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(409, "You have already applied to this event")
        }
        throw error
    }

    return res.status(201).json(
        new ApiResponse(201, application, "Application submitted successfully")
    )
})

const getMyApplications = asyncHandler(async (req, res) => {

    const applications = await SponsorApplication.find({
        sponsor: req.user._id,
        isDeleted: false
    })
        .populate("event", "eventName date location ask thumbnail status isDeleted")
        .sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(200, applications, "Applications fetched successfully")
    )
})

const getMyEventApplication = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const application = await SponsorApplication.findOne({
        sponsor: req.user._id,
        event: req.params.id,
        isDeleted: false
    })

    return res.status(200).json(
        new ApiResponse(200, application, "Application fetched successfully")
    )
})

const getEventApplications = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)

    const applications = await SponsorApplication.find({
        event: event._id,
        isDeleted: false
    })
        .populate("sponsor", "username")
        .sort({ createdAt: -1 })
        .lean()

    const profiles = await Sponsor.find({
        sponsor: { $in: applications.map((item) => item.sponsor?._id).filter(Boolean) },
        isDeleted: false
    })
        .select("sponsor brandName logo description brandKpi brandType")
        .populate("brandType", "name")
        .lean()

    const profileBySponsor = new Map(profiles.map((item) => [String(item.sponsor), item]))

    return res.status(200).json(
        new ApiResponse(
            200,
            applications.map((item) => ({
                ...item,
                brand: profileBySponsor.get(String(item.sponsor?._id)) || null
            })),
            "Applications fetched successfully"
        )
    )
})

const updateApplicationStatus = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)

    if (!mongoose.Types.ObjectId.isValid(req.params.applicationId)) {
        throw new ApiError(400, "Invalid application id")
    }

    const status = req.body?.status
    if (!["accepted", "rejected"].includes(status)) {
        throw new ApiError(400, "Status must be accepted or rejected")
    }

    const application = await SponsorApplication.findOne({
        _id: req.params.applicationId,
        event: event._id,
        isDeleted: false
    })

    if (!application) {
        throw new ApiError(404, "Application not found")
    }

    const updateData = { status }
    if (status === "accepted") {
        updateData.finalAmount = application.negotiations.at(-1).amount
    }

    // Matching on status keeps a concurrent decision from being overwritten
    const updated = await SponsorApplication.findOneAndUpdate(
        { _id: application._id, status: "pending" },
        { $set: updateData },
        { new: true, runValidators: true }
    )

    if (!updated) {
        throw new ApiError(409, "This application has already been decided")
    }

    return res.status(200).json(
        new ApiResponse(200, updated, `Application ${status}`)
    )
})

module.exports = {
    applyToEvent,
    getMyApplications,
    getMyEventApplication,
    getEventApplications,
    updateApplicationStatus
}
