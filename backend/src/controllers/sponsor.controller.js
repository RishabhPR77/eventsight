const crypto = require("crypto");
const { default: mongoose } = require("mongoose");
const { Prediction } = require("../models/prediction.model");
const { hasOtherSponsor, sponsoredEventIds } = require("../utility/dealRules");
const { EventCategory } = require("../models/eventCategory.model");
const { Organizer } = require("../models/organizer.model");
const { BrandType } = require("../models/sponserBrandTypes.model");
const { Sponsor } = require("../models/sponsers.model");
const { ApiError } = require("../utility/ApiError");
const { ApiResponse } = require("../utility/ApiResponse");
const { asyncHandler } = require("../utility/AsyncHandler");
const { uploadOnCloudinary } = require("../utility/cloudinary");
const { eventCreate } = require("./organizer.controller");
const {EventFeedBack}=require("../models/eventFeedBack.model")
const { mlFailure, postToMl } = require("../utility/mlClient")
const { escapeRegex } = require("../utility/escapeRegex")
const { eventCutoff } = require("../utility/eventDates")
const { SponsorApplication } = require("../models/sponsorApplication.model")
const { findConfirmedDeal, hasOpenDeals, isEventFinished } = require("../utility/dealRules")
const { notify } = require("../utility/notifier")

const DEFAULT_FEEDBACK_RATINGS = Object.freeze({
    organizerReputation: 0.5,
    lineupQuality: 0.55,
    activationMaturity: 0.5
})

const buildFeedbackAggregateFields = () => ({
    totalFeedbacks: { $size: "$feedbacks" },
    avgOrganizerReputation: {
        $cond: [
            { $gt: [{ $size: "$feedbacks" }, 0] },
            {
                $divide: [
                    { $add: [{ $sum: "$feedbacks.organizerReputation" }, DEFAULT_FEEDBACK_RATINGS.organizerReputation] },
                    { $add: [{ $size: "$feedbacks" }, 1] }
                ]
            },
            DEFAULT_FEEDBACK_RATINGS.organizerReputation
        ]
    },
    avgLineupQuality: {
        $cond: [
            { $gt: [{ $size: "$feedbacks" }, 0] },
            {
                $divide: [
                    { $add: [{ $sum: "$feedbacks.lineupQuality" }, DEFAULT_FEEDBACK_RATINGS.lineupQuality] },
                    { $add: [{ $size: "$feedbacks" }, 1] }
                ]
            },
            DEFAULT_FEEDBACK_RATINGS.lineupQuality
        ]
    }
})

const applyEventFilters = (filter, query) => {
    if (query.search) {
        const term = { $regex: escapeRegex(query.search), $options: "i" }
        filter.$or = [{ eventName: term }, { location: term }]
    }
    if (query.category && mongoose.Types.ObjectId.isValid(query.category)) {
        filter.eventCategory = new mongoose.Types.ObjectId(query.category)
    }
    if (query.location) {
        filter.location = String(query.location)
    }
}

const createSponsorProfile = asyncHandler(async (req, res) => {
    // Check if ANY profile exists (including deleted ones)
    const existing = await Sponsor.findOne({ sponsor: req.user._id });

    const { brandName, brandType, description, brandKpi, cityFocus } = req.body;

    if (!brandName || !brandType || !description || !brandKpi || !cityFocus) {
        throw new ApiError(400, "All fields are required");
    }

    const existBrandType = await BrandType.findById(brandType);
    if (!existBrandType) {
        throw new ApiError(400, "Brand type not exist");
    }

    const logoFile = req.file || (req.files && req.files.find(f => f.fieldname === "logo"));
    const sponsorLogoLocalFilePath = logoFile?.path;

    let sponsorLogo;
    if (sponsorLogoLocalFilePath) {
        sponsorLogo = await uploadOnCloudinary(sponsorLogoLocalFilePath);
        if (!sponsorLogo) {
            throw new ApiError(500, "Logo upload failed");
        }
    }

    if (existing) {
        // If it was deleted, restore and update it. 
        // If no new logo is provided during 'Create' attempt, we clear the old one to ensure a clean start.
        const sponsor = await Sponsor.findByIdAndUpdate(
            existing._id,
            {
                brandName,
                brandType,
                description,
                brandKpi,
                cityFocus,
                isDeleted: false,
                logo: sponsorLogo ? (sponsorLogo.secure_url || sponsorLogo.url) : null
            },
            { new: true }
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                sponsor,
                "Sponsor profile updated successfully"
            )
        );
    }

    // Create new if nothing exists at all
    const sponsor = await Sponsor.create({
        sponsor: req.user._id,
        brandName,
        brandType,
        description,
        brandKpi,
        cityFocus,
        logo: sponsorLogo?.secure_url || sponsorLogo?.url || null
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            sponsor,
            "Sponsor profile created successfully"
        )
    );
});

const getSponsorProfile=asyncHandler(async(req,res)=>{
    const profile=await Sponsor.findOne({sponsor:req.user._id,isDeleted:false})
    .populate("brandType","name");
    if (!profile) {
        return res.status(200).json(new ApiResponse(200, null, "Sponsor profile not found"));
    }

     return res.status(200).json(
        new ApiResponse(200, profile, "Sponsor profile fetched successfully")
    )
})

const updateSponsorProfile = asyncHandler(async (req, res) => {
    const data = req.body

    if ((!data || Object.keys(data).length === 0) && !req.file && (!req.files || req.files.length === 0)) {
        throw new ApiError(400, "No data provided for update")
    }

    const allowedFields = ["brandName", "brandType", "description", "brandKpi", "cityFocus"]

    const updateData = {}

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            updateData[key] = data[key]
        }
    }

    if (Object.keys(updateData).length === 0 && !req.file && (!req.files || req.files.length === 0)) {
        throw new ApiError(400, "No valid fields to update")
    }


    if (updateData.brandType) {
        const existBrandType = await BrandType.findById(updateData.brandType)
        if (!existBrandType) {
            throw new ApiError(404, "Brand type not found")
        }
    }


    const fileToUpload = req.file || (req.files && req.files.find(f => f.fieldname === "logo")) || (req.files && req.files[0]);
    if (fileToUpload) {
        const upload = await uploadOnCloudinary(fileToUpload.path)
        if (!upload) throw new ApiError(500, "Logo upload failed")
        updateData.logo = upload.secure_url || upload.url
    }

    const profile = await Sponsor.findOneAndUpdate(
        { sponsor: req.user._id, isDeleted: false },
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate("brandType", "name")

    if (!profile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    return res.status(200).json(
        new ApiResponse(200, profile, "Sponsor profile updated successfully")
    )
})

const deleteSponsorProfile = asyncHandler(async (req, res) => {

    if (await hasOpenDeals(req.user)) {
        throw new ApiError(409, "Finish your accepted sponsorships before deleting your profile")
    }

    const profile = await Sponsor.findOneAndUpdate(
        { sponsor: req.user._id, isDeleted: false },
        { isDeleted: true },
        { new: true }
    )

    if (!profile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Sponsor profile deleted successfully")
    )
})

const getAllEvents = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const skip = (page - 1) * limit

    const filter = {
        isDeleted: false,
        date: { $gte: eventCutoff() },
        // Events another brand already sponsors are hidden
        _id: { $nin: await sponsoredEventIds(req.user._id) }
    }

    applyEventFilters(filter, req.query)

    if (req.query.isIndoor !== undefined) {
        filter.isIndoor = req.query.isIndoor === "true"
    }

    if (req.query.minAsk || req.query.maxAsk) {
        filter.ask = {}
        if (req.query.minAsk) filter.ask.$gte = Number(req.query.minAsk)
        if (req.query.maxAsk) filter.ask.$lte = Number(req.query.maxAsk)
    }

    const result = await Organizer.aggregate([

        { $match: filter },

        
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

       
        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),
                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: "upcoming"
            }
        },

        { $project: { feedbacks: 0 } },

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                events: [
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        }
    ])

    const events = result[0]?.events || []
    const total = result[0]?.totalCount[0]?.count || 0

    return res.status(200).json(
        new ApiResponse(200, {
            events,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }, "Events fetched successfully")
    )
})
// Averages feedback across an organizer's finished events, starting from the defaults
const getOrganizerRatings = async (pastEventIds) => {
    const [stats] = await EventFeedBack.aggregate([
        { $match: { event: { $in: pastEventIds }, isDeleted: false } },
        {
            $group: {
                _id: null,
                feedbackCount: { $sum: 1 },
                sumOrganizerReputation: { $sum: "$organizerReputation" },
                sumLineupQuality: { $sum: "$lineupQuality" }
            }
        }
    ])

    if (!stats) {
        return {
            totalFeedbacks: 0,
            avgOrganizerReputation: DEFAULT_FEEDBACK_RATINGS.organizerReputation,
            avgLineupQuality: DEFAULT_FEEDBACK_RATINGS.lineupQuality
        }
    }

    const divisor = stats.feedbackCount + 1
    return {
        totalFeedbacks: stats.feedbackCount,
        avgOrganizerReputation: (stats.sumOrganizerReputation + DEFAULT_FEEDBACK_RATINGS.organizerReputation) / divisor,
        avgLineupQuality: (stats.sumLineupQuality + DEFAULT_FEEDBACK_RATINGS.lineupQuality) / divisor
    }
}

const getEventById = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.id),
                isDeleted: false
            }
        },

       
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

       
        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        
        {
            $lookup: {
                from: "organizers",
                localField: "organizer",
                foreignField: "organizer",
                as: "allOrganizerEvents"
            }
        },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),

                
                pastEventOrganized: {
                    $size: {
                        $filter: {
                            input: "$allOrganizerEvents",
                            as: "e",
                            cond: {
                                $and: [
                                    { $lt: ["$$e.date", eventCutoff()] },
                                    { $eq: ["$$e.isDeleted", false] }
                                ]
                            }
                        }
                    }
                },

                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: { $cond: [{ $lt: ["$date", eventCutoff()] }, "completed", "upcoming"] }
            }
        },

        
        { $project: { feedbacks: 0, allOrganizerEvents: 0 } }

    ])

    if (!event.length) {
        throw new ApiError(404, "Event not found")
    }

    const pastEvents = await Organizer.find({
        organizer: event[0].organizer,
        isDeleted: false,
        date: { $lt: eventCutoff() }
    }).select("_id")

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                ...event[0],
                ...(await getOrganizerRatings(pastEvents.map((item) => item._id))),
                hasSponsor: Boolean(await hasOtherSponsor(event[0]._id, req.user._id))
            },
            "Event fetched successfully"
        )
    )
})

const giveFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.findOne({
        _id: req.params.id,
        isDeleted: false
    })

    if (!event || !isEventFinished(event)) {
        throw new ApiError(404, "Event not found or not completed yet")
    }

    const deal = await findConfirmedDeal(req.user._id, event._id)

    if (!deal) {
        throw new ApiError(403, "Feedback opens once you and the organizer both confirm this sponsorship")
    }

    const existing = await EventFeedBack.findOne({
        event: req.params.id,
        sponsor: req.user._id
    })

    if (existing) {
        throw new ApiError(400, "Feedback already submitted for this event")
    }

    const { organizerReputation, lineupQuality } = req.body

    const feedback = await EventFeedBack.create({
        event: req.params.id,
        sponsor: req.user._id,
        organizerReputation,
        lineupQuality
    })

    const profile = await Sponsor.findOne({ sponsor: req.user._id }).select("brandName").lean()
    await notify({
        user: event.organizer,
        type: "feedback",
        title: `${profile?.brandName || "A sponsor"} left feedback`,
        body: event.eventName,
        link: `/organizer/event/${event._id}`
    })

    return res.status(201).json(
        new ApiResponse(201, feedback, "Feedback submitted successfully")
    )
})

const getMyFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const feedback = await EventFeedBack.findOne({
        event: req.params.id,
        sponsor: req.user._id,
        isDeleted: false
    }).populate("event", "eventName date location")

    if (!feedback) {
        throw new ApiError(404, "Feedback not found")
    }

    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback fetched successfully")
    )
})

const updateFeedback = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid event id")
    }

    const { organizerReputation, lineupQuality } = req.body

    const feedback = await EventFeedBack.findOneAndUpdate(
        { event: req.params.id, sponsor: req.user._id },
        { $set: { organizerReputation, lineupQuality } },
        { new: true, runValidators: true }
    )

    if (!feedback) {
        throw new ApiError(404, "Feedback not found")
    }

    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback updated successfully")
    )
})



const getPrediction = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    
    const sponsorProfile = await Sponsor.findOne({
        sponsor: req.user._id,
        isDeleted: false
    }).populate("brandType", "name")

    if (!sponsorProfile) {
        throw new ApiError(404, "Sponsor profile not found")
    }

    if (!sponsorProfile.brandType) {
        throw new ApiError(400, "Choose a brand type in your profile first")
    }

    
    const event = await Organizer.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.eventId),
                isDeleted: false,
                date: { $gte: eventCutoff() }
            }
        },

    
        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

        
        {
            $lookup: {
                from: "organizers",
                localField: "organizer",
                foreignField: "organizer",
                as: "allOrganizerEvents"
            }
        },

        {
            $addFields: {
                totalSocialReach: { $sum: "$socialMediaAccount.followers" },
                
                pastEventOrganized: {
                    $size: {
                        $filter: {
                            input: "$allOrganizerEvents",
                            as: "e",
                            cond: {
                                $and: [
                                    { $lt: ["$$e.date", eventCutoff()] },
                                    { $eq: ["$$e.isDeleted", false] }
                                ]
                            }
                        }
                    }
                },
               
                pastEventIds: {
                    $map: {
                        input: {
                            $filter: {
                                input: "$allOrganizerEvents",
                                as: "e",
                                cond: {
                                    $and: [
                                        { $lt: ["$$e.date", eventCutoff()] },
                                        { $eq: ["$$e.isDeleted", false] }
                                    ]
                                }
                            }
                        },
                        as: "e",
                        in: "$$e._id"
                    }
                }
            }
        },

        { $project: { allOrganizerEvents: 0 } }
    ])

    if (!event.length) {
        throw new ApiError(404, "Event not found")
    }

    const eventData = event[0]

    const { avgOrganizerReputation, avgLineupQuality } = await getOrganizerRatings(eventData.pastEventIds)

    // Activation maturity describes the brand, so it comes from what organizers
    // rated this sponsor, not from the organizer of the event being predicted
    const activationStats = await SponsorApplication.aggregate([
        { $match: { sponsor: req.user._id, activationRating: { $ne: null } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$activationRating" } } }
    ])
    const avgActivationMaturity = activationStats.length
        ? (activationStats[0].total + DEFAULT_FEEDBACK_RATINGS.activationMaturity) / (activationStats[0].count + 1)
        : DEFAULT_FEEDBACK_RATINGS.activationMaturity

    const brandInput = {
        company_name:      sponsorProfile.brandName,
        industry:          sponsorProfile.brandType.name,
        brand_description: sponsorProfile.description
    }

    const predictInput = {
        city:                      eventData.location,
        event_type:                eventData.eventCategory?.name || "",
        sponsor_category:          sponsorProfile.brandType.name,
        brand_name:                sponsorProfile.brandName,
        brand_description:         sponsorProfile.description,
        event_description:         eventData.eventDescription,
        date:                      new Date(eventData.date).toISOString().split("T")[0],
        price:                     eventData.ticketPrice,
        marketing_budget:          eventData.marketingBudget,
        sponsor_amount:            eventData.ask,
        venue_capacity:            eventData.capacity,
        organizer_reputation:      avgOrganizerReputation,
        lineup_quality:            avgLineupQuality,
        brand_activation_maturity: avgActivationMaturity,
        is_indoor:                 eventData.isIndoor ? 1 : 0,
        is_festive:                eventData.isFestive ? 1 : 0,
        social_media_reach:        eventData.totalSocialReach,
        past_events_organized:     eventData.pastEventOrganized,
        brand_kpi:                 sponsorProfile.brandKpi,
        brand_city_focus:          sponsorProfile.cityFocus
    }

    const inputsHash = crypto.createHash("sha256").update(JSON.stringify(predictInput)).digest("hex")

    const saved = await Prediction.findOne({ sponsor: req.user._id, event: eventData._id, inputsHash }).lean()
    if (saved) {
        return res.status(200).json(
            new ApiResponse(200, { ...saved.result, savedAt: saved.updatedAt }, "Prediction fetched successfully")
        )
    }

    let analyzeBrandResponse
    try {
        analyzeBrandResponse = await postToMl("/analyze-brand", brandInput)
    } catch (error) {
        throw mlFailure(error, "/analyze-brand")
    }

    let predictResponse
    try {
        predictResponse = await postToMl("/predict", predictInput)
    } catch (error) {
        throw mlFailure(error, "/predict")
    }

    const result = {
        brandAnalysis: analyzeBrandResponse.data,
        prediction: predictResponse.data
    }

    // Two tabs can finish together, and the unique index keeps one of their answers
    await Prediction.findOneAndUpdate(
        { sponsor: req.user._id, event: eventData._id },
        { $set: { inputsHash, result } },
        { upsert: true }
    ).catch((error) => {
        if (error.code !== 11000) throw error
    })

    return res.status(200).json(
        new ApiResponse(200, result, "Prediction fetched successfully")
    )
})

const getCompletedEvents = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const skip = (page - 1) * limit

    const filter = {
        isDeleted: false,
        date: { $lt: eventCutoff() }
    }

    applyEventFilters(filter, req.query)

    const result = await Organizer.aggregate([
        { $match: filter },

        {
            $lookup: {
                from: "eventcategories",
                localField: "eventCategory",
                foreignField: "_id",
                as: "eventCategory"
            }
        },
        { $unwind: { path: "$eventCategory", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "users",
                localField: "organizer",
                foreignField: "_id",
                as: "organizerInfo"
            }
        },
        { $unwind: { path: "$organizerInfo", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "eventfeedbacks",
                localField: "_id",
                foreignField: "event",
                as: "feedbacks"
            }
        },

        {
            $lookup: {
                from: "sponsorapplications",
                let: { eventId: "$_id" },
                pipeline: [
                    { $match: { sponsor: req.user._id, $expr: { $eq: ["$event", "$$eventId"] } } },
                    { $project: { status: 1, sponsorConfirmedAt: 1, organizerConfirmedAt: 1 } }
                ],
                as: "myApplication"
            }
        },
        { $unwind: { path: "$myApplication", preserveNullAndEmptyArrays: true } },

        {
            $addFields: {
                ...buildFeedbackAggregateFields(),
                myFeedback: {
                    $filter: {
                        input: "$feedbacks",
                        as: "f",
                        cond: { $eq: ["$$f.sponsor", req.user._id] }
                    }
                },
                "organizerInfo.password": "$$REMOVE",
                "organizerInfo.refreshToken": "$$REMOVE",
                status: "completed"
            }
        },

        {
            $addFields: {
                hasFeedback: { $gt: [{ $size: "$myFeedback" }, 0] },
                canGiveFeedback: {
                    $and: [
                        { $eq: ["$myApplication.status", "accepted"] },
                        { $gt: ["$myApplication.sponsorConfirmedAt", null] },
                        { $gt: ["$myApplication.organizerConfirmedAt", null] }
                    ]
                }
            }
        },

        { $project: { feedbacks: 0, myFeedback: 0 } },
        { $sort: { date: -1 } },

        {
            $facet: {
                events: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: "count" }]
            }
        }
    ])

    const events = result[0]?.events || []
    const total = result[0]?.totalCount[0]?.count || 0

    return res.status(200).json(
        new ApiResponse(200, {
            events,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        }, "Completed events fetched successfully")
    )
})

module.exports={
    createSponsorProfile,
    getSponsorProfile,
    updateSponsorProfile,
    deleteSponsorProfile,
    getAllEvents,
    getCompletedEvents,
    getEventById,
    giveFeedback,
    getMyFeedback,
    updateFeedback,
    getPrediction
}