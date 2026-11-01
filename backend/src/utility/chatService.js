const { Conversation } = require("../models/conversation.model");
const { Message } = require("../models/message.model");
const { User } = require("../models/user.model");
const { emitToRoom, notify } = require("./notifier");

const PREVIEW_LENGTH = 120;

const findOrCreateConversation = async ({ organizerId, sponsorId, eventId }) => {
    const existing = await Conversation.findOne({ organizerId, sponsorId, eventId });
    if (existing) return existing;

    // Two tabs can start the same chat at once; the unique index picks one winner
    return Conversation.create({ organizerId, sponsorId, eventId }).catch((err) => {
        if (err.code === 11000) return Conversation.findOne({ organizerId, sponsorId, eventId });
        throw err;
    });
};

const saveMessage = async ({ conversation, senderId, senderRole, text = "", attachment, kind = "text" }) => {
    const message = await Message.create({
        conversationId: conversation._id,
        senderId,
        senderRole,
        kind,
        text,
        attachment
    });

    const preview = text || (attachment ? `Sent ${attachment.name}` : "");

    await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: preview.slice(0, PREVIEW_LENGTH),
        updatedAt: Date.now()
    });

    emitToRoom(conversation._id, "receive_message", message);
    return { message, preview };
};

// Text and file messages: saved, sent to the open chat, and added to the other side's bell
const postMessage = async ({ conversation, senderId, senderRole, text, attachment }) => {
    const { message, preview } = await saveMessage({ conversation, senderId, senderRole, text, attachment });

    const recipient = senderRole === "sponsor" ? conversation.organizerId : conversation.sponsorId;
    const sender = await User.findById(senderId).select("username");

    await notify({
        user: recipient,
        type: "message",
        title: `New message from ${sender?.username || "your contact"}`,
        body: preview.slice(0, PREVIEW_LENGTH),
        link: `/messages/${conversation._id}`,
        conversation: conversation._id
    });

    return message;
};

// Puts an offer or decision into the conversation, so the negotiation reads as one timeline
const postDealUpdate = async ({ organizerId, sponsorId, eventId, senderId, senderRole, text }) => {
    try {
        const conversation = await findOrCreateConversation({ organizerId, sponsorId, eventId });
        await saveMessage({ conversation, senderId, senderRole, text, kind: "deal" });
    } catch (err) {
        console.error("Deal message failed:", err);
    }
};

module.exports = { findOrCreateConversation, postMessage, postDealUpdate };
