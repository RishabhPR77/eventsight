// backend/routes/chat.route.js
const router = require('express').Router();
const mongoose = require('mongoose');
const {Message} = require('../models/message.model');
const {Conversation} = require('../models/conversation.model');
const {Notification} = require('../models/notification.model');
const {Organizer} = require('../models/organizer.model');
const {Sponsor} = require('../models/sponsers.model');
const {SponsorApplication} = require('../models/sponsorApplication.model');
const {verifyJwt} = require('../middleware/auth.middleware');
const {uploadAttachment} = require('../middleware/multer.middleware');
const {isParticipant} = require('../utility/chatAccess');
const {findOrCreateConversation, postMessage} = require('../utility/chatService');
const {uploadOnCloudinary} = require('../utility/cloudinary');
const {emitToRoom} = require('../utility/notifier');

const MESSAGE_HISTORY_LIMIT = 200;
const MAX_FILE_NAME_LENGTH = 120;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Loads a conversation the caller is part of, or answers with the right error
const loadOwnConversation = async (req, res) => {
  const id = req.params.conversationId;
  if (!isValidId(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return null;
  }
  const convo = await Conversation.findById(id);
  if (!convo) {
    res.status(404).json({ error: "Conversation not found" });
    return null;
  }
  if (!isParticipant(convo, req.user._id)) {
    res.status(403).json({ error: "Not a participant of this conversation" });
    return null;
  }
  return convo;
};

// Adds what the inbox shows: the other person, the event and the unread count
const summarize = async (convos, userId) => {
  const sponsorIds = convos.map((convo) => convo.sponsorId?._id).filter(Boolean);
  const profiles = await Sponsor.find({ sponsor: { $in: sponsorIds }, isDeleted: false }).select('sponsor brandName logo').lean();
  const brandBySponsor = new Map(profiles.map((item) => [String(item.sponsor), item]));

  const unreadCounts = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: convos.map((convo) => convo._id) },
        senderId: { $ne: userId },
        kind: 'text',
        isRead: false
      }
    },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } }
  ]);
  const unreadByConversation = new Map(unreadCounts.map((item) => [String(item._id), item.count]));

  return convos.map((convo) => {
    const isSponsor = String(convo.sponsorId?._id) === String(userId);
    const brand = brandBySponsor.get(String(convo.sponsorId?._id));
    return {
      _id: convo._id,
      role: isSponsor ? 'sponsor' : 'organizer',
      event: convo.eventId ? { _id: convo.eventId._id, eventName: convo.eventId.eventName, status: convo.eventId.status } : null,
      other: isSponsor
        ? { name: convo.organizerId?.username || 'Deleted user', logo: null }
        : { name: brand?.brandName || convo.sponsorId?.username || 'Deleted user', logo: brand?.logo || null },
      lastMessage: convo.lastMessage,
      updatedAt: convo.updatedAt,
      unread: unreadByConversation.get(String(convo._id)) || 0
    };
  });
};

const populateConversation = (query) => query
  .populate('organizerId', 'username')
  .populate('sponsorId', 'username')
  .populate('eventId', 'eventName status');

router.use(verifyJwt);

// Conversation start karo ya dhundo
router.post('/conversation', async (req, res) => {
  try {
    const { organizerId, sponsorId, eventId } = req.body;
    if (!organizerId || !sponsorId || !eventId) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    if (![organizerId, sponsorId, eventId].every(isValidId)) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    // The caller must be one side of the chat, and organizerId must own the event
    const requester = { organizerId, sponsorId };
    if (!isParticipant(requester, req.user._id)) {
      return res.status(403).json({ error: "Not a participant of this conversation" });
    }
    const event = await Organizer.findOne({ _id: eventId, organizer: organizerId, isDeleted: false });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const existing = await Conversation.findOne({ organizerId, sponsorId, eventId });
    if (existing) return res.json(existing);

    // Sponsors start chats; organizers can only reach sponsors who applied
    const canStart = req.user.role === 'sponsor'
      || await SponsorApplication.exists({ sponsor: sponsorId, event: eventId, status: { $ne: "withdrawn" } });
    if (!canStart) {
      return res.status(403).json({ error: "This sponsor has not contacted you yet" });
    }

    res.json(await findOrCreateConversation({ organizerId, sponsorId, eventId }));
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize conversation" });
  }
});

// Inbox
router.get('/conversations', async (req, res) => {
  try {
    const convos = await populateConversation(Conversation.find({
      $or: [{ organizerId: req.user._id }, { sponsorId: req.user._id }],
      lastMessage: { $nin: [null, ''] }
    })).sort({ updatedAt: -1 }).lean();

    res.json(await summarize(convos, req.user._id));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// One conversation, with the live deal so offers can be handled from the chat
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const own = await loadOwnConversation(req, res);
    if (!own) return;

    const convo = await populateConversation(Conversation.findById(own._id)).lean();
    const [summary] = await summarize([convo], req.user._id);
    const deal = await SponsorApplication.findOne({
      sponsor: own.sponsorId,
      event: own.eventId,
      isDeleted: false
    }).select('status negotiations finalAmount sponsorConfirmedAt organizerConfirmedAt').lean();

    res.json({ ...summary, deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// Purane messages load karo
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const convo = await loadOwnConversation(req, res);
    if (!convo) return;

    const messages = await Message.find({ conversationId: convo._id })
      .sort({ createdAt: -1 })
      .limit(MESSAGE_HISTORY_LIMIT);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post('/conversations/:conversationId/read', async (req, res) => {
  try {
    const convo = await loadOwnConversation(req, res);
    if (!convo) return;

    await Promise.all([
      Message.updateMany({ conversationId: convo._id, senderId: { $ne: req.user._id }, isRead: false }, { isRead: true }),
      Notification.updateMany({ user: req.user._id, conversation: convo._id, read: false }, { read: true })
    ]);
    emitToRoom(convo._id, 'messages_read', { conversationId: convo._id, readerId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update messages" });
  }
});

// File bhejo: image ya PDF, saath mein optional text
router.post('/conversations/:conversationId/attachments', ...uploadAttachment('file'), async (req, res, next) => {
  try {
    const convo = await loadOwnConversation(req, res);
    if (!convo) return;
    if (!req.file) {
      return res.status(400).json({ error: "Choose a file to send" });
    }

    const upload = await uploadOnCloudinary(req.file.path, { resourceType: req.file.mimetype === 'application/pdf' ? 'raw' : 'image' });
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, MAX_FILE_NAME_LENGTH);

    const message = await postMessage({
      conversation: convo,
      senderId: req.user._id,
      senderRole: String(convo.sponsorId) === String(req.user._id) ? 'sponsor' : 'organizer',
      text: String(req.body?.text || '').trim().slice(0, 2000),
      attachment: { url: upload.secure_url || upload.url, name, type: req.file.mimetype, size: req.file.size }
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// Get conversations for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    if (!isValidId(req.params.eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }
    // Only the event's organizer sees all of its conversations
    const event = await Organizer.findOne({ _id: req.params.eventId, organizer: req.user._id });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const convos = await Conversation.find({ eventId: req.params.eventId }).populate('sponsorId', 'username email').sort({ updatedAt: -1 });
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

const chatRoute = router;
module.exports = {chatRoute};
