const { Notification } = require("../models/notification.model");
const { User } = require("../models/user.model");
const { alertEmail } = require("./emailTemplates");
const { sendEmail } = require("./sendEmail");

let io = null;

const setIo = (server) => {
    io = server;
};

const emitToRoom = (room, event, payload) => {
    io?.to(String(room)).emit(event, payload);
};

// Each signed-in tab joins a room named after the user
const isOnline = (user) => Boolean(io?.sockets.adapter.rooms.has(String(user)));

// The bell only works while someone is on the site, so email the people who aren't
const emailAlert = async ({ user, title, body, link }) => {
    if (isOnline(user)) return;

    const recipient = await User.findById(user).select("email emailAlerts isVerified").lean();
    if (!recipient?.isVerified || recipient.emailAlerts === false) return;

    await sendEmail(recipient.email, alertEmail({ title, body, link }));
};

// A failed notification must never fail the action that caused it
const notify = async ({ user, type, title, body, link, conversation }) => {
    try {
        const fields = { user, type, title, body, link, conversation, read: false };

        // Unread chats update in place, so a busy conversation stays one bell item
        // and only its first unread message sends an email
        const alreadyUnread = conversation && await Notification.exists({ user, conversation, read: false });
        const notification = conversation
            ? await Notification.findOneAndUpdate(
                { user, conversation, read: false },
                { $set: fields },
                { new: true, upsert: true }
            )
            : await Notification.create(fields);

        emitToRoom(user, "notification", notification);

        if (!alreadyUnread) {
            emailAlert({ user, title, body, link }).catch((err) => console.error("Email alert failed:", err.message));
        }
    } catch (err) {
        console.error("Notification failed:", err);
    }
};

module.exports = { setIo, emitToRoom, notify };
