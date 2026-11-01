const { Notification } = require("../models/notification.model");

let io = null;

const setIo = (server) => {
    io = server;
};

const emitToRoom = (room, event, payload) => {
    io?.to(String(room)).emit(event, payload);
};

// A failed notification must never fail the action that caused it
const notify = async ({ user, type, title, body, link, conversation }) => {
    try {
        const fields = { user, type, title, body, link, conversation, read: false };

        // Unread chats update in place, so a busy conversation stays one bell item
        const notification = conversation
            ? await Notification.findOneAndUpdate(
                { user, conversation, read: false },
                { $set: fields },
                { new: true, upsert: true }
            )
            : await Notification.create(fields);

        emitToRoom(user, "notification", notification);
    } catch (err) {
        console.error("Notification failed:", err);
    }
};

module.exports = { setIo, emitToRoom, notify };
