// backend/socket/chatSocket.js
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const {Message} = require('../models/message.model');
const {Conversation} = require('../models/conversation.model');
const {User} = require('../models/user.model');
const {isParticipant} = require('../utility/chatAccess');

module.exports = (io) => {
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
    console.log('User connected:', socket.id);

    // Personal room for global notifications
    socket.join(userId);

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

    // Message bhejo
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text } = data || {};
        if (typeof text !== 'string' || !text.trim()) return;

        const convo = await Conversation.findById(conversationId);
        if (!convo || !isParticipant(convo, userId)) return;

        const senderRole = convo.sponsorId.toString() === userId ? 'sponsor' : 'organizer';
        const message = await Message.create({
          conversationId, senderId: userId, senderRole, text
        });

        // Conversation ka lastMessage update karo
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: Date.now()
        });

        const recipientId = senderRole === 'sponsor' ? convo.organizerId : convo.sponsorId;
        // Global notification bhejo recipient ko
        io.to(recipientId.toString()).emit('new_notification', {
          conversationId,
          eventId: convo.eventId,
          text
        });

        // Dono users ko message milega (in-chat)
        io.to(conversationId).emit('receive_message', message);
      } catch (err) {
        console.error("Socket error processing send_message:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
