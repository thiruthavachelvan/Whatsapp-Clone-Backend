const Message = require('../models/Message');
const Group = require('../models/Group');

// @desc    Get conversation
// @route   GET /api/messages/:senderId/:receiverId
// @access  Public
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const isGroup = req.query.isGroup === 'true';

    if (isGroup) {
      const messages = await Message.find({ groupId: receiverId })
        .populate('senderId', 'username avatarColor avatarLetter')
        .sort({ createdAt: 1 });
      return res.status(200).json(messages);
    }

    // 1. Mark all messages from senderId to receiverId as read automatically
    const result = await Message.updateMany(
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
    const messages = await Message.find({
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

    if (!senderId || (!receiverId && !groupId) || !text) {
      return res.status(400).json({ message: 'Please provide senderId, text, and either receiverId or groupId' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      groupId,
      text,
    });

    if (groupId) {
      await Group.findByIdAndUpdate(groupId, { updatedAt: Date.now() });
    }

    const populatedMessage = await Message.findById(message._id)
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

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Please provide senderId and receiverId' });
    }

    // 1. Mark as read in DB
    await Message.updateMany(
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
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isStarred = !message.isStarred;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle star' });
  }
};

// @desc    Get starred messages for a user
// @route   GET /api/messages/starred/:userId
// @access  Public
const getStarredMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find groups user is a member of
    const userGroups = await Group.find({ members: { $in: [userId] } }).select('_id');
    const groupIds = userGroups.map(g => g._id);

    const starredMessages = await Message.find({
      isStarred: true,
      $or: [
        { senderId: userId },
        { receiverId: userId },
        { groupId: { $in: groupIds } }
      ]
    })
    .populate('senderId', 'username avatarColor avatarLetter')
    .populate('receiverId', 'username avatarColor avatarLetter')
    .populate('groupId', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json(starredMessages);
  } catch (error) {
    console.error("Error fetching starred messages:", error);
    res.status(500).json({ message: 'Failed to get starred messages' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead,
  toggleStar,
  getStarredMessages
};
