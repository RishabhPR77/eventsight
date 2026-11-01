const mongoose = require("mongoose")
const { EventFeedBack } = require("../models/eventFeedBack.model")
const { Organizer } = require("../models/organizer.model")
const { Sponsor } = require("../models/sponsers.model")
const { SponsorApplication } = require("../models/sponsorApplication.model")
const { ApiError } = require("../utility/ApiError")
const { ApiResponse } = require("../utility/ApiResponse")
const { asyncHandler } = require("../utility/AsyncHandler")
const { postDealUpdate } = require("../utility/chatService")
const { eventCutoff } = require("../utility/eventDates")
const { isEventFinished, OPEN_STATUSES } = require("../utility/dealRules")
const { notify } = require("../utility/notifier")

const MAX_MESSAGE_LENGTH = 1000
const MAX_NEGOTIATION_ROUNDS = 12

const organizerLink = (eventId) => `/organizer/event/${eventId}`
const sponsorLink = (eventId) => `/sponsor/event/${eventId}`
const inr = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`

const brandNameOf = async (sponsorId) => {
    const profile = await Sponsor.findOne({ sponsor: sponsorId }).select("brandName").lean()
    return profile?.brandName || "A sponsor"
}

const dealUpdate = (event, sponsorId, senderId, senderRole, text) => postDealUpdate({
    organizerId: event.organizer,
    sponsorId,
    eventId: event._id,
    senderId,
    senderRole,
    text
})

const requireOwnEvent = async (eventId, organizerId) => {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.findOne({
        _id: eventId,
        organizer: organizerId,
        isDeleted: false
    }).select("_id date eventName organizer")

    if (!event) {
        throw new ApiError(404, "Event not found")
    }

    return event
}

const requireEvent = async (eventId) => {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.findOne({ _id: eventId, isDeleted: false }).select("_id date eventName organizer")

    if (!event) {
        throw new ApiError(404, "Event not found")
    }

    return event
}

const requireEventApplication = async (applicationId, eventId) => {
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        throw new ApiError(400, "Invalid application id")
    }

    const application = await SponsorApplication.findOne({ _id: applicationId, event: eventId, isDeleted: false })

    if (!application) {
        throw new ApiError(404, "Application not found")
    }

    return application
}

const requireMyApplication = async (sponsorId, eventId) => {
    const application = await SponsorApplication.findOne({ sponsor: sponsorId, event: eventId, isDeleted: false })

    if (!application) {
        throw new ApiError(404, "Application not found")
    }

    return application
}

const assertStillOpen = (event) => {
    if (isEventFinished(event)) {
        throw new ApiError(400, "This event is over, so offers can no longer change")
    }
}

const assertConfirmable = (application, event) => {
    if (application.status !== "accepted") {
        throw new ApiError(400, "Only accepted sponsorships can be confirmed")
    }
    if (!isEventFinished(event)) {
        throw new ApiError(400, "Sponsorships can be confirmed after the event is over")
    }
}

const readOffer = (body) => {
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, "Offered amount must be greater than 0")
    }

    const message = typeof body?.message === "string" ? body.message.trim() : ""
    if (message.length > MAX_MESSAGE_LENGTH) {
        throw new ApiError(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`)
    }

    return { amount, message }
}

// Each side answers the other's latest offer, so nobody can bid against themselves
const addCounterOffer = async (application, from, offer) => {
    if (!OPEN_STATUSES.includes(application.status)) {
        throw new ApiError(409, "This negotiation has already ended")
    }

    const latest = application.negotiations.at(-1)

    if (latest.from === from) {
        throw new ApiError(409, "Wait for the other side to reply to your offer")
    }
    if (latest.amount === offer.amount) {
        throw new ApiError(400, "That matches the current offer, so you can just accept it")
    }
    if (application.negotiations.length >= MAX_NEGOTIATION_ROUNDS) {
        throw new ApiError(400, "This negotiation has reached its limit. Accept or reject the current offer")
    }

    application.negotiations.push({ from, ...offer })
    application.status = "negotiating"
    await application.save()
}

// Matching on the open statuses keeps a concurrent decision from being overwritten
const closeNegotiation = async (application, update) => {
    const updated = await SponsorApplication.findOneAndUpdate(
        { _id: application._id, status: { $in: OPEN_STATUSES } },
        { $set: update },
        { new: true, runValidators: true }
    )

    if (!updated) {
        throw new ApiError(409, "This application has already been decided")
    }

    return updated
}

const applyToEvent = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const { amount, message } = readOffer(req.body)

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

    await dealUpdate(event, req.user._id, req.user._id, "sponsor", `${profile.brandName} offered ${inr(amount)}${message ? `: ${message}` : ""}`)
    await notify({
        user: event.organizer,
        type: "offer",
        title: `${profile.brandName} offered ${inr(amount)}`,
        body: event.eventName,
        link: organizerLink(event._id)
    })

    return res.status(201).json(
        new ApiResponse(201, application, "Application submitted successfully")
    )
})

const getMyApplications = asyncHandler(async (req, res) => {

    const applications = await SponsorApplication.find({
        sponsor: req.user._id,
        isDeleted: false
    })
        .populate("event", "eventName date location ask thumbnail status isDeleted organizer")
        .sort({ updatedAt: -1 })

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

const withBrands = async (applications) => {
    const profiles = await Sponsor.find({
        sponsor: { $in: applications.map((item) => item.sponsor?._id).filter(Boolean) },
        isDeleted: false
    })
        .select("sponsor brandName logo description brandKpi brandType")
        .populate("brandType", "name")
        .lean()

    const profileBySponsor = new Map(profiles.map((item) => [String(item.sponsor), item]))

    return applications.map((item) => ({
        ...item,
        brand: profileBySponsor.get(String(item.sponsor?._id)) || null
    }))
}

const getEventApplications = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)

    const applications = await SponsorApplication.find({
        event: event._id,
        isDeleted: false
    })
        .populate("sponsor", "username")
        .sort({ updatedAt: -1 })
        .lean()

    return res.status(200).json(
        new ApiResponse(200, await withBrands(applications), "Applications fetched successfully")
    )
})

// Every open deal across the organizer's events, for the dashboard to-do list
const getOrganizerApplications = asyncHandler(async (req, res) => {

    const events = await Organizer.find({ organizer: req.user._id, isDeleted: false }).select("_id")

    const applications = await SponsorApplication.find({
        event: { $in: events.map((event) => event._id) },
        status: { $in: [...OPEN_STATUSES, "accepted"] },
        isDeleted: false
    })
        .populate("sponsor", "username")
        .populate("event", "eventName date location status")
        .sort({ updatedAt: -1 })
        .lean()

    return res.status(200).json(
        new ApiResponse(200, await withBrands(applications), "Applications fetched successfully")
    )
})

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

// Finished events with who sponsored them, what they raised and how they were rated
const getOrganizerHistory = asyncHandler(async (req, res) => {

    const events = await Organizer.find({
        organizer: req.user._id,
        isDeleted: false,
        date: { $lt: eventCutoff() }
    })
        .populate("eventCategory", "name")
        .select("eventName date location thumbnail eventCategory")
        .sort({ date: -1 })
        .lean()

    const eventIds = events.map((event) => event._id)

    const [deals, feedback] = await Promise.all([
        SponsorApplication.find({ event: { $in: eventIds }, status: "accepted", isDeleted: false })
            .populate("sponsor", "username")
            .lean()
            .then(withBrands),
        EventFeedBack.find({ event: { $in: eventIds }, isDeleted: false }).select("event organizerReputation").lean()
    ])

    const history = events.map((event) => {
        const sameEvent = (item) => String(item.event) === String(event._id)
        const sponsors = deals.filter(sameEvent).map((deal) => ({
            _id: deal._id,
            id: deal.sponsor?._id || deal._id,
            name: deal.brand?.brandName || deal.sponsor?.username || "Deleted sponsor",
            logo: deal.brand?.logo || null,
            amount: deal.finalAmount
        }))
        const ratings = feedback.filter(sameEvent).map((item) => item.organizerReputation)

        return {
            ...event,
            sponsors,
            raised: sponsors.reduce((sum, sponsor) => sum + sponsor.amount, 0),
            rating: average(ratings),
            feedbackCount: ratings.length
        }
    })

    return res.status(200).json(
        new ApiResponse(200, {
            summary: {
                events: history.length,
                raised: history.reduce((sum, event) => sum + event.raised, 0),
                rating: average(feedback.map((item) => item.organizerReputation))
            },
            events: history
        }, "History fetched successfully")
    )
})

// Sponsorships on finished events, kept even if the organizer later removes the event
const getSponsorHistory = asyncHandler(async (req, res) => {

    const deals = await SponsorApplication.find({ sponsor: req.user._id, status: "accepted", isDeleted: false })
        .populate({
            path: "event",
            select: "eventName date location thumbnail isDeleted organizer",
            populate: { path: "organizer", select: "username" }
        })
        .lean()

    const finished = deals
        .filter((deal) => deal.event && isEventFinished(deal.event))
        .sort((a, b) => b.event.date - a.event.date)

    const feedback = await EventFeedBack.find({
        sponsor: req.user._id,
        event: { $in: finished.map((deal) => deal.event._id) }
    }).select("event").lean()

    const reviewed = new Set(feedback.map((item) => String(item.event)))

    const sponsorships = finished.map((deal) => ({
        _id: deal._id,
        event: deal.event,
        organizerName: deal.event.organizer?.username || "Deleted organizer",
        amount: deal.finalAmount,
        confirmed: Boolean(deal.sponsorConfirmedAt && deal.organizerConfirmedAt),
        hasFeedback: reviewed.has(String(deal.event._id))
    }))

    return res.status(200).json(
        new ApiResponse(200, {
            summary: {
                events: sponsorships.length,
                spent: sponsorships.reduce((sum, item) => sum + item.amount, 0),
                organizers: new Set(sponsorships.map((item) => item.organizerName)).size
            },
            sponsorships
        }, "History fetched successfully")
    )
})

const updateApplicationStatus = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)
    const application = await requireEventApplication(req.params.applicationId, event._id)

    const status = req.body?.status
    if (!["accepted", "rejected"].includes(status)) {
        throw new ApiError(400, "Status must be accepted or rejected")
    }

    assertStillOpen(event)

    const latest = application.negotiations.at(-1)

    if (status === "accepted" && latest.from === "organizer") {
        throw new ApiError(409, "That's your own offer. Wait for the sponsor to reply")
    }

    const accepted = status === "accepted"
    const updated = await closeNegotiation(application, accepted ? { status, finalAmount: latest.amount } : { status })

    await dealUpdate(event, application.sponsor, req.user._id, "organizer", accepted ? `Deal agreed at ${inr(latest.amount)}` : "The organizer rejected this offer")
    await notify({
        user: application.sponsor,
        type: status,
        title: accepted ? `Your offer of ${inr(latest.amount)} was accepted` : "Your offer was rejected",
        body: event.eventName,
        link: sponsorLink(event._id)
    })

    return res.status(200).json(
        new ApiResponse(200, updated, `Application ${status}`)
    )
})

const counterAsOrganizer = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)
    const application = await requireEventApplication(req.params.applicationId, event._id)
    const offer = readOffer(req.body)

    assertStillOpen(event)
    await addCounterOffer(application, "organizer", offer)

    await dealUpdate(event, application.sponsor, req.user._id, "organizer", `${req.user.username} countered with ${inr(offer.amount)}${offer.message ? `: ${offer.message}` : ""}`)
    await notify({
        user: application.sponsor,
        type: "counter",
        title: `${req.user.username} countered with ${inr(offer.amount)}`,
        body: event.eventName,
        link: sponsorLink(event._id)
    })

    return res.status(200).json(
        new ApiResponse(200, application, "Counter-offer sent")
    )
})

const counterAsSponsor = asyncHandler(async (req, res) => {

    const event = await requireEvent(req.params.id)
    const application = await requireMyApplication(req.user._id, event._id)
    const offer = readOffer(req.body)

    assertStillOpen(event)
    await addCounterOffer(application, "sponsor", offer)

    const brand = await brandNameOf(req.user._id)
    await dealUpdate(event, req.user._id, req.user._id, "sponsor", `${brand} countered with ${inr(offer.amount)}${offer.message ? `: ${offer.message}` : ""}`)
    await notify({
        user: event.organizer,
        type: "counter",
        title: `${brand} countered with ${inr(offer.amount)}`,
        body: event.eventName,
        link: organizerLink(event._id)
    })

    return res.status(200).json(
        new ApiResponse(200, application, "Counter-offer sent")
    )
})

const acceptAsSponsor = asyncHandler(async (req, res) => {

    const event = await requireEvent(req.params.id)
    const application = await requireMyApplication(req.user._id, event._id)

    assertStillOpen(event)

    const latest = application.negotiations.at(-1)

    if (latest.from === "sponsor") {
        throw new ApiError(409, "That's your own offer. Wait for the organizer to reply")
    }

    const updated = await closeNegotiation(application, { status: "accepted", finalAmount: latest.amount })

    const brand = await brandNameOf(req.user._id)
    await dealUpdate(event, req.user._id, req.user._id, "sponsor", `Deal agreed at ${inr(latest.amount)}`)
    await notify({
        user: event.organizer,
        type: "accepted",
        title: `${brand} accepted ${inr(latest.amount)}`,
        body: event.eventName,
        link: organizerLink(event._id)
    })

    return res.status(200).json(
        new ApiResponse(200, updated, "Offer accepted")
    )
})

const withdrawApplication = asyncHandler(async (req, res) => {

    const event = await requireEvent(req.params.id)

    const application = await SponsorApplication.findOneAndUpdate(
        { sponsor: req.user._id, event: event._id, status: { $in: OPEN_STATUSES }, isDeleted: false },
        { $set: { status: "withdrawn" } },
        { new: true }
    )

    if (!application) {
        throw new ApiError(409, "Only an open offer can be withdrawn")
    }

    const brand = await brandNameOf(req.user._id)
    await dealUpdate(event, req.user._id, req.user._id, "sponsor", `${brand} withdrew their offer`)
    await notify({
        user: event.organizer,
        type: "withdrawn",
        title: `${brand} withdrew their offer`,
        body: event.eventName,
        link: organizerLink(event._id)
    })

    return res.status(200).json(
        new ApiResponse(200, application, "Application withdrawn")
    )
})

const notifyFeedbackOpen = (application, event) => notify({
    user: application.sponsor,
    type: "feedback",
    title: "Feedback is open",
    body: `Both sides confirmed ${event.eventName}`,
    link: sponsorLink(event._id)
})

const confirmAsSponsor = asyncHandler(async (req, res) => {

    const event = await requireEvent(req.params.id)
    const application = await requireMyApplication(req.user._id, event._id)

    assertConfirmable(application, event)

    if (application.sponsorConfirmedAt) {
        throw new ApiError(409, "You have already confirmed this sponsorship")
    }

    application.sponsorConfirmedAt = new Date()
    await application.save()

    await notify({
        user: event.organizer,
        type: "confirm",
        title: `${await brandNameOf(req.user._id)} confirmed the sponsorship`,
        body: event.eventName,
        link: organizerLink(event._id)
    })
    if (application.organizerConfirmedAt) await notifyFeedbackOpen(application, event)

    return res.status(200).json(
        new ApiResponse(200, application, "Sponsorship confirmed")
    )
})

const confirmAsOrganizer = asyncHandler(async (req, res) => {

    const event = await requireOwnEvent(req.params.eventId, req.user._id)
    const application = await requireEventApplication(req.params.applicationId, event._id)

    assertConfirmable(application, event)

    if (application.organizerConfirmedAt) {
        throw new ApiError(409, "You have already confirmed this sponsorship")
    }

    application.organizerConfirmedAt = new Date()
    application.activationRating = req.body.activationMaturity
    await application.save()

    await notify({
        user: application.sponsor,
        type: "confirm",
        title: `${req.user.username} confirmed the sponsorship`,
        body: event.eventName,
        link: sponsorLink(event._id)
    })
    if (application.sponsorConfirmedAt) await notifyFeedbackOpen(application, event)

    return res.status(200).json(
        new ApiResponse(200, application, "Sponsorship confirmed")
    )
})

module.exports = {
    applyToEvent,
    getMyApplications,
    getMyEventApplication,
    getEventApplications,
    getOrganizerApplications,
    getOrganizerHistory,
    getSponsorHistory,
    updateApplicationStatus,
    counterAsOrganizer,
    counterAsSponsor,
    acceptAsSponsor,
    withdrawApplication,
    confirmAsSponsor,
    confirmAsOrganizer
}
