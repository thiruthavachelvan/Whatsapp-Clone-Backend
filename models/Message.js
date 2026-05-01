const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: false,
    },
    text: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pinExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
