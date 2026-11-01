// backend/socket/chatSocket.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const {Conversation} = require('../models/conversation.model');
const {User} = require('../models/user.model');
const {isParticipant} = require('../utility/chatAccess');
const {postMessage} = require('../utility/chatService');
const {setIo} = require('../utility/notifier');

const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_LIMIT = 20;
const MESSAGE_WINDOW_MS = 10 * 1000;

module.exports = (io) => {
  setIo(io);

  // Socket ka user cookie ke JWT se aata hai, client ke data se nahi
  io.use(async (socket, next) => {
    try {
      const { accessToken } = cookie.parse(socket.handshake.headers.cookie || '');
      if (!accessToken) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select('_id role');
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Personal room for notifications
    socket.join(userId);

    let windowStart = 0;
    let sentInWindow = 0;
    const isFlooding = () => {
      if (Date.now() - windowStart > MESSAGE_WINDOW_MS) {
        windowStart = Date.now();
        sentInWindow = 0;
      }
      sentInWindow += 1;
      return sentInWindow > MESSAGE_LIMIT;
    };

    // Room join karo (conversationId ke basis pe), sirf participants ke liye
    socket.on('join_room', async (conversationId) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (convo && isParticipant(convo, userId)) {
          socket.join(conversationId);
        }
      } catch (err) {
        console.error("Socket error processing join_room:", err);
      }
    });

    socket.on('leave_room', (conversationId) => {
      socket.leave(conversationId);
    });

    socket.on('typing', (conversationId) => {
      if (socket.rooms.has(conversationId)) {
        socket.to(conversationId).emit('typing', { conversationId, userId });
      }
    });

    // Message bhejo
    socket.on('send_message', async (data) => {
      try {
        if (isFlooding()) return;

        const { conversationId, text } = data || {};
        if (typeof text !== 'string' || !text.trim() || text.length > MAX_MESSAGE_LENGTH) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !isParticipant(conversation, userId)) return;

        await postMessage({
          conversation,
          senderId: userId,
          senderRole: conversation.sponsorId.toString() === userId ? 'sponsor' : 'organizer',
          text
        });
      } catch (err) {
        console.error("Socket error processing send_message:", err);
      }
    });
  });
};
