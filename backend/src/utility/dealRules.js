const { Organizer } = require("../models/organizer.model");
const { Otp } = require("../models/otp.model");
const { Sponsor } = require("../models/sponsers.model");
const { SponsorApplication } = require("../models/sponsorApplication.model");
const { eventCutoff } = require("./eventDates");

const isEventFinished = (event) => event.date < eventCutoff();

// A sponsorship is final once it was accepted and both sides confirmed it after the event
const findConfirmedDeal = (sponsorId, eventId) => SponsorApplication.findOne({
    sponsor: sponsorId,
    event: eventId,
    status: "accepted",
    sponsorConfirmedAt: { $ne: null },
    organizerConfirmedAt: { $ne: null }
});

const UNCONFIRMED_DEAL = {
    status: "accepted",
    $or: [{ sponsorConfirmedAt: null }, { organizerConfirmedAt: null }]
};

const hasOpenDeals = async (user) => {
    if (user.role === "sponsor") {
        return Boolean(await SponsorApplication.exists({ sponsor: user._id, ...UNCONFIRMED_DEAL }));
    }
    const events = await Organizer.find({ organizer: user._id }).select("_id");
    return Boolean(await SponsorApplication.exists({
        event: { $in: events.map((event) => event._id) },
        ...UNCONFIRMED_DEAL
    }));
};

const rejectPendingApplications = (eventIds) => SponsorApplication.updateMany(
    { event: { $in: eventIds }, status: "pending" },
    { status: "rejected" }
);

// Feedback and accepted deals stay: they are the history other users' scores rest on
const removeUserData = async (user) => {
    const events = await Organizer.find({ organizer: user._id }).select("_id");
    const eventIds = events.map((event) => event._id);

    await Promise.all([
        Otp.deleteMany({ user: user._id }),
        Sponsor.updateOne({ sponsor: user._id }, { isDeleted: true }),
        Organizer.updateMany({ _id: { $in: eventIds } }, { isDeleted: true }),
        SponsorApplication.updateMany({ sponsor: user._id, status: "pending" }, { status: "withdrawn" }),
        rejectPendingApplications(eventIds)
    ]);
};

module.exports = {
    isEventFinished,
    findConfirmedDeal,
    hasOpenDeals,
    rejectPendingApplications,
    removeUserData
};
