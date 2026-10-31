// backend/routes/chat.route.js
const router = require('express').Router();
const mongoose = require('mongoose');
const {Message} = require('../models/message.model');
const {Conversation} = require('../models/conversation.model');
const {Organizer} = require('../models/organizer.model');
const {SponsorApplication} = require('../models/sponsorApplication.model');
const {verifyJwt} = require('../middleware/auth.middleware');
const {isParticipant} = require('../utility/chatAccess');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

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

    let convo = await Conversation.findOne({ organizerId, sponsorId, eventId });
    if (!convo) {
      // Sponsors start chats; organizers can only reach sponsors who applied
      const canStart = req.user.role === 'sponsor'
        || await SponsorApplication.exists({ sponsor: sponsorId, event: eventId, status: { $ne: "withdrawn" } });
      if (!canStart) {
        return res.status(403).json({ error: "This sponsor has not contacted you yet" });
      }
      convo = await Conversation.create({ organizerId, sponsorId, eventId });
    }
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize conversation" });
  }
});

// Purane messages load karo
router.get('/messages/:conversationId', async (req, res) => {
  try {
    if (!isValidId(req.params.conversationId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!isParticipant(convo, req.user._id)) {
      return res.status(403).json({ error: "Not a participant of this conversation" });
    }

    const messages = await Message.find({
      conversationId: req.params.conversationId
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
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
