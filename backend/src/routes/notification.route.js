const express = require("express");
const mongoose = require("mongoose");
const { verifyJwt } = require("../middleware/auth.middleware");
const { Notification } = require("../models/notification.model");
const { ApiError } = require("../utility/ApiError");
const { ApiResponse } = require("../utility/ApiResponse");
const { asyncHandler } = require("../utility/AsyncHandler");

const LIST_LIMIT = 30;

const notificationRoute = express.Router();

notificationRoute.use(verifyJwt);

notificationRoute.get("/", asyncHandler(async (req, res) => {
    const [notifications, unread] = await Promise.all([
        Notification.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(LIST_LIMIT),
        Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    return res.status(200).json(new ApiResponse(200, { notifications, unread }, "Notifications fetched"));
}));

notificationRoute.post("/read-all", asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.status(200).json(new ApiResponse(200, null, "Notifications marked as read"));
}));

notificationRoute.post("/:id/read", asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid notification id");
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { read: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read"));
}));

module.exports = { notificationRoute };
