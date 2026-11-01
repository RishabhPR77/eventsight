const mongoose = require("mongoose")
const { asyncHandler } = require("../utility/AsyncHandler");
const { ApiError } = require("../utility/ApiError.js")
const { ApiResponse } = require("../utility/ApiResponse.js");
const { Organizer } = require("../models/organizer.model.js");
const { uploadOnCloudinary } = require("../utility/cloudinary.js");
const { EventCategory } = require("../models/eventCategory.model.js");
const { escapeRegex } = require("../utility/escapeRegex.js");
const { eventCutoff } = require("../utility/eventDates.js");
const { City } = require("../models/city.model.js");
const { SponsorApplication } = require("../models/sponsorApplication.model.js");
const { isEventFinished, rejectPendingApplications } = require("../utility/dealRules.js");


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



// Predictions only work for cities the model knows, which is what the admin list holds
const assertKnownCity = async (location) => {
    if (!(await City.exists({ name: location, isDeleted: false }))) {
        throw new ApiError(400, "Select a city from the list")
    }
};

const parseSocialMedia = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(s => ({ ...s, link: typeof s.link === 'string' ? s.link.replace(/^"|"$/g, '').trim() : s.link }));
    if (typeof raw !== 'string') return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(s => ({ ...s, link: typeof s.link === 'string' ? s.link.replace(/^"|"$/g, '').trim() : s.link })) : [];
    } catch { return []; }
};

const eventCreate = asyncHandler(async (req, res) => {
    const {
        eventName,
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        ticketPrice,
        marketingBudget,
        isIndoor,
        isFestive,
        socialMediaAccount: rawSocial
    } = req.body;

    const socialMediaAccount = parseSocialMedia(rawSocial);

    if (
        !eventName?.trim() ||
        !eventCategory ||
        !eventDescription?.trim() ||
        !location ||
        capacity === undefined || capacity === null ||
        !date ||
        ask === undefined || ask === null ||
        ticketPrice === undefined || ticketPrice === null ||
        marketingBudget === undefined || marketingBudget === null ||
        isIndoor === undefined
    ) {
        throw new ApiError(400, "All fields are required")
    }

    await assertKnownCity(location);

    const existingEventCategory = await EventCategory.findById(eventCategory);

    if (!existingEventCategory) {
        throw new ApiError(404, "Event Category not Found");
    }

    const thumbnailFile = req.file || (req.files && req.files.find(f => f.fieldname === "thumbnail")) || (req.files && req.files[0]);
    const thumbnailLocalFilePath = thumbnailFile?.path;

    let uploadThumbnail;
    if (thumbnailLocalFilePath) {
        uploadThumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

        if (!uploadThumbnail) {
            throw new ApiError(500, "Error while uploading on cloudinary")
        }
    }


    let event;
    try {
        event = await Organizer.create({
            organizer: req.user._id,
            eventName,
            eventCategory,
            eventDescription,
            location,
            capacity,
            date,
            ask,
            ticketPrice,
            marketingBudget,
            isIndoor,
            isFestive,
            socialMediaAccount,
            thumbnail: uploadThumbnail?.secure_url || uploadThumbnail?.url || null
        })
    } catch (createError) {
        console.error("EVENT CREATE DB ERROR:", createError);
        throw createError;
    }

    return res.status(201).json(
        new ApiResponse(201,
            event,
            "Event created Successfully"
        )
    );

})


const getOrganizerEvents = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)

    const skip = (page - 1) * limit

    const filter = {
        organizer: req.user._id,
        isDeleted: false
    }

    if (req.query.type === "active" || req.query.type === "upcoming") {
        filter.date = { $gte: eventCutoff() };
    }

    if (req.query.type === "expired" || req.query.type === "completed") {
        filter.date = { $lt: eventCutoff() };
    }

    if (req.query.search) {
        const term = { $regex: escapeRegex(req.query.search), $options: "i" }
        filter.$or = [{ eventName: term }, { location: term }]
    }

    if (req.query.category) {
        filter.eventCategory = req.query.category
    }

    if (req.query.location) {
        filter.location = {
            $regex: escapeRegex(req.query.location),
            $options: "i"
        }
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

        {
            $unwind: {
                path: "$eventCategory",
                preserveNullAndEmptyArrays: true
            }
        },



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
                status: {
                    $cond: { if: { $lt: ["$date", eventCutoff()] }, then: "completed", else: "upcoming" }
                }
            }
        },
        {
            $project: {
                feedbacks: 0
            }
        },

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                events: [
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalCount: [
                    { $count: "count" }
                ],
                pastEventsCount: [
                    { $match: { date: { $lt: eventCutoff() } } },
                    { $count: "count" }
                ]
            }
        }

    ])

    const events = result[0]?.events || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const pastEventsOrganized = result[0]?.pastEventsCount[0]?.count || 0

    // Counted apart from the filters, so the dashboard totals don't change with a search
    const mine = { organizer: req.user._id, isDeleted: false }
    const [upcomingCount, completedCount] = await Promise.all([
        Organizer.countDocuments({ ...mine, date: { $gte: eventCutoff() } }),
        Organizer.countDocuments({ ...mine, date: { $lt: eventCutoff() } })
    ])

    return res.status(200).json(

        new ApiResponse(
            200,
            {
                events,
                pastEventsOrganized: pastEventsOrganized,
                summary: { upcoming: upcomingCount, completed: completedCount },
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            },
            "Events fetched successfully"
        )
    )

})

const getOrganizerEventsById = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    const event = await Organizer.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.params.eventId),
                organizer: req.user._id,
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

        {
            $unwind: {
                path: "$eventCategory",
                preserveNullAndEmptyArrays: true
            }
        },



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
                status: {
                    $cond: { if: { $lt: ["$date", eventCutoff()] }, then: "completed", else: "upcoming" }
                }
            }
        }

    ])

    if (!event.length) {
        throw new ApiError(404, "Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event[0],
            "Event fetched by id successfully"
        )
    )
})

const updateEvent = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    const data = req.body

    if ((!data || Object.keys(data).length === 0) && !req.file && (!req.files || req.files.length === 0)) {
        throw new ApiError(400, "No data provided for update")
    }

    const currentEvent = await Organizer.findOne({
        _id: req.params.eventId,
        organizer: req.user._id,
        isDeleted: false
    })

    if (!currentEvent) {
        throw new ApiError(404, "Event not found")
    }

    if (isEventFinished(currentEvent)) {
        throw new ApiError(400, "A finished event can't be edited")
    }

    const allowedFields = [
        "eventName",
        "eventCategory",
        "eventDescription",
        "location",
        "capacity",
        "date",
        "ask",
        "ticketPrice",
        "marketingBudget",
        "isIndoor",
        "isFestive",
        "socialMediaAccount"
    ]

    const updateData = {}

    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            if (key === 'socialMediaAccount') {
                updateData[key] = parseSocialMedia(data[key])
            } else {
                updateData[key] = data[key]
            }
        }
    }

    if (Object.keys(updateData).length === 0 && !req.file && (!req.files || req.files.length === 0)) {
        throw new ApiError(400, "No valid fields to update")
    }



    if (updateData.eventName) {
        updateData.eventName = updateData.eventName.trim()
    }

    if (updateData.eventDescription) {
        updateData.eventDescription = updateData.eventDescription.trim()
    }

    if (updateData.location) {
        updateData.location = updateData.location.trim()
        await assertKnownCity(updateData.location)
    }

    // Sponsors agreed to a place and date, so an accepted deal locks them
    const dateChanged = updateData.date !== undefined
        && new Date(updateData.date).getTime() !== currentEvent.date.getTime()
    const locationChanged = updateData.location !== undefined
        && updateData.location !== currentEvent.location

    if ((dateChanged || locationChanged)
        && await SponsorApplication.exists({ event: currentEvent._id, status: "accepted" })) {
        throw new ApiError(409, "Date and city can't change after a sponsor is accepted")
    }



    if (updateData.eventCategory) {

        if (!mongoose.Types.ObjectId.isValid(updateData.eventCategory)) {
            throw new ApiError(400, "Invalid event category id")
        }

        const category = await EventCategory.findById(updateData.eventCategory)

        if (!category) {
            throw new ApiError(404, "Event category not found")
        }
    }



    if (updateData.date) {
        const newDate = new Date(updateData.date)

        if (newDate < eventCutoff()) {
            throw new ApiError(400, "Event date must be today or later")
        }
    }



    const fileToUpload = req.file || (req.files && req.files.find(f => f.fieldname === "thumbnail")) || (req.files && req.files[0]);
    if (fileToUpload) {
        const upload = await uploadOnCloudinary(fileToUpload.path)

        if (!upload) {
            throw new ApiError(500, "Thumbnail upload failed")
        }

        updateData.thumbnail = upload.secure_url || upload.url
    }

    const event = await Organizer.findOneAndUpdate(

        {
            _id: req.params.eventId,
            organizer: req.user._id,
            isDeleted: false
        },

        { $set: updateData },

        {
            new: true,
            runValidators: true
        }
    )

    if (!event) {
        throw new ApiError(404, "Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event updated successfully"
        )
    )

})

//updateThumbnail option should be
const deleteEvent = asyncHandler(async (req, res) => {

    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        throw new ApiError(400, "Invalid event id")
    }

    if (await SponsorApplication.exists({ event: req.params.eventId, status: "accepted" })) {
        throw new ApiError(409, "An event with an accepted sponsor can't be deleted")
    }

    const event = await Organizer.findOneAndUpdate(

        {
            _id: req.params.eventId,
            organizer: req.user._id,
            isDeleted: false
        },

        { isDeleted: true },

        { new: true }

    )

    if (!event) {
        throw new ApiError(404, "Event not found")
    }

    await rejectPendingApplications([event._id])

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event deleted successfully"
        )
    )

})



module.exports = { eventCreate, getOrganizerEvents, getOrganizerEventsById, updateEvent, deleteEvent }

