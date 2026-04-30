const Message = require('../models/Message');

// @desc    Get conversation
// @route   GET /api/messages/:senderId/:receiverId
// @access  Public
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 }); // Oldest first

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get messages' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/send
// @access  Public
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/mark-read
// @access  Public
const markMessagesRead = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Please provide senderId and receiverId' });
    }

    // Mark all messages sent by senderId to receiverId as read
    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead
};
