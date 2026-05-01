const mongoose = require('mongoose');

// @desc    Get conversation
// @route   GET /api/messages/:senderId/:receiverId
// @access  Public
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const isGroup = req.query.isGroup === 'true';
    const MessageModel = mongoose.model('Message');

    if (isGroup) {
      const messages = await MessageModel.find({ groupId: receiverId })
        .populate('senderId', 'username avatarColor avatarLetter')
        .sort({ createdAt: 1 });
      return res.status(200).json(messages);
    }

    // 1. Mark all messages from senderId to receiverId as read automatically
    const result = await MessageModel.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. If messages were updated, notify the sender via socket to show blue ticks
    if (result.modifiedCount > 0) {
      const io = req.app.get('socketio');
      const activeUsers = req.app.get('activeUsers');
      const senderSocketId = activeUsers.get(senderId);
      
      if (senderSocketId && io) {
        io.to(senderSocketId).emit('messagesRead', {
          receiverId
        });
      }
    }

    // 3. Fetch all messages for the conversation
    const messages = await MessageModel.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/send
// @access  Public
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, groupId, text } = req.body;
    const MessageModel = mongoose.model('Message');
    const GroupModel = mongoose.model('Group');

    if (!senderId || (!receiverId && !groupId) || !text) {
      return res.status(400).json({ message: 'Please provide senderId, text, and either receiverId or groupId' });
    }

    const message = await MessageModel.create({
      senderId,
      receiverId,
      groupId,
      text,
    });

    if (groupId) {
      await GroupModel.findByIdAndUpdate(groupId, { updatedAt: Date.now() });
    }

    const populatedMessage = await MessageModel.findById(message._id)
      .populate('senderId', 'username avatarColor avatarLetter');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/mark-read
// @access  Public
const markMessagesRead = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const MessageModel = mongoose.model('Message');

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Please provide senderId and receiverId' });
    }

    // 1. Mark as read in DB
    await MessageModel.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Notify the sender via socket
    const io = req.app.get('socketio');
    const activeUsers = req.app.get('activeUsers');
    const senderSocketId = activeUsers.get(senderId);
    
    if (senderSocketId && io) {
      io.to(senderSocketId).emit('messagesRead', {
        receiverId
      });
    }

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error("Error in markMessagesRead:", error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};

// @desc    Toggle star on a message
// @route   PUT /api/messages/star/:id
// @access  Public
const toggleStar = async (req, res) => {
  try {
    const { userId } = req.body;
    const MessageModel = mongoose.model('Message');
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const message = await MessageModel.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Toggle the userId in the starredBy array
    const index = message.starredBy.indexOf(userId);
    if (index === -1) {
      message.starredBy.push(userId);
    } else {
      message.starredBy.splice(index, 1);
    }
    
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in toggleStar:", error);
    res.status(500).json({ message: 'Failed to toggle star' });
  }
};

// @desc    Get starred messages for a user
// @route   GET /api/messages/starred/:userId
// @access  Public
const getStarredMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid User ID format' });
    }

    const MessageModel = mongoose.model('Message');

    // Only find messages where this specific user has starred it
    const starredMessages = await MessageModel.find({
      starredBy: userId
    })
    .populate('senderId', 'username avatarColor avatarLetter')
    .populate('receiverId', 'username avatarColor avatarLetter')
    .populate('groupId', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json(starredMessages);
  } catch (error) {
    console.error("ERROR in getStarredMessages:", error);
    res.status(500).json({ message: 'Failed to fetch starred messages', error: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead,
  toggleStar,
  getStarredMessages
};
