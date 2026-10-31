const isParticipant = (conversation, userId) =>
  [conversation.organizerId, conversation.sponsorId].some(
    (id) => id && id.toString() === userId.toString()
  );

module.exports = { isParticipant };
