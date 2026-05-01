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

    // 1. Mark all messages FROM the other person TO the current user as read automatically
    const result = await MessageModel.updateMany(
      { senderId: receiverId, receiverId: senderId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. If messages were updated, notify the sender (the other person) via socket to show blue ticks
    if (result.modifiedCount > 0) {
      const io = req.app.get('socketio');
      const activeUsers = req.app.get('activeUsers');
      // senderId in params is the receiver (me), receiverId in params is the sender (them)
      const otherUserSocketId = activeUsers.get(receiverId); 
      
      if (otherUserSocketId && io) {
        io.to(otherUserSocketId).emit('messagesRead', {
          receiverId: senderId // Tell them that I (senderId) have read their messages
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
    const { senderId, receiverId, groupId, text, type, mediaUrl, mediaName, mediaSize } = req.body;
    const MessageModel = mongoose.model('Message');
    const GroupModel = mongoose.model('Group');

    if (!senderId || (!receiverId && !groupId)) {
      return res.status(400).json({ message: 'Please provide senderId and either receiverId or groupId' });
    }

    if ((!type || type === 'text') && (!text || text.trim() === '')) {
      return res.status(400).json({ message: 'Please provide text for text messages' });
    }

    const message = await MessageModel.create({
      senderId,
      receiverId,
      groupId,
      text: text || '',
      type: type || 'text',
      mediaUrl,
      mediaName,
      mediaSize
    });

    // Unhide chat for both sender and receiver if it was hidden
    const UserModel = mongoose.model('User');
    if (receiverId) {
      // 1. Unhide for sender
      await UserModel.findByIdAndUpdate(senderId, {
        $pull: { hiddenChats: receiverId }
      });
      // 2. Unhide for receiver
      await UserModel.findByIdAndUpdate(receiverId, {
        $pull: { hiddenChats: senderId }
      });
    }

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

// @desc    Clear messages in a conversation
// @route   DELETE /api/messages/clear
// @access  Public
const clearChat = async (req, res) => {
  try {
    const { userId, targetId, isGroup } = req.body;
    const MessageModel = mongoose.model('Message');

    if (isGroup) {
      await MessageModel.deleteMany({ groupId: targetId });
    } else {
      await MessageModel.deleteMany({
        $or: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId }
        ]
      });
    }

    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (error) {
    console.error("Error in clearChat:", error);
    res.status(500).json({ message: 'Failed to clear chat' });
  }
};

// @desc    Search messages globally
// @route   GET /api/messages/search
// @access  Public
const searchMessages = async (req, res) => {
  try {
    const { userId, query } = req.query;
    if (!userId || !query) {
      return res.status(400).json({ message: 'User ID and query are required' });
    }

    const MessageModel = mongoose.model('Message');
    
    // Find messages that contain the query and involve the user
    const messages = await MessageModel.find({
      text: { $regex: query, $options: 'i' },
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .populate('senderId', 'username avatarColor avatarLetter')
    .populate('receiverId', 'username avatarColor avatarLetter')
    .populate('groupId', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchMessages:", error);
    res.status(500).json({ message: 'Failed to search messages' });
  }
};

// @desc    Search messages in a specific conversation
// @route   GET /api/messages/search/:senderId/:targetId
// @access  Public
const searchInConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const { query, isGroup } = req.query;

    if (!senderId || !receiverId || !query) {
      return res.status(400).json({ message: 'Parameters and query are required' });
    }

    const MessageModel = mongoose.model('Message');
    let filter = { text: { $regex: query, $options: 'i' } };

    if (isGroup === 'true') {
      filter.groupId = receiverId;
    } else {
      filter.$or = [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ];
    }

    const messages = await MessageModel.find(filter)
      .populate('senderId', 'username avatarColor avatarLetter')
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchInConversation:", error);
    res.status(500).json({ message: 'Failed to search messages in conversation' });
  }
};

// @desc    Delete message (me or everyone)
// @route   PUT /api/messages/delete/:id
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, type } = req.body; // type: 'me' or 'everyone'

    const message = await mongoose.model('Message').findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (type === 'everyone') {
      // Only sender can delete for everyone
      if (message.senderId.toString() !== userId) {
        return res.status(403).json({ message: 'Only sender can delete for everyone' });
      }
      message.isDeletedForEveryone = true;
      message.text = 'This message was deleted'; // For legacy support if frontend doesn't handle flag
    } else {
      if (!message.deletedBy.includes(userId)) {
        message.deletedBy.push(userId);
      }
    }

    await message.save();
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// @desc    Pin message
// @route   PUT /api/messages/pin/:id
const pinMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, duration } = req.body; // duration in hours

    const message = await mongoose.model('Message').findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.pinnedBy = userId;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + parseInt(duration));
    message.pinExpiry = expiry;

    await message.save();
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Failed to pin message' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead,
  toggleStar,
  getStarredMessages,
  clearChat,
  searchMessages,
  searchInConversation,
  deleteMessage,
  pinMessage
};
