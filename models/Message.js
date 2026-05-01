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
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio'],
      default: 'text'
    },
    text: {
      type: String,
      required: function() { return this.type === 'text'; }, // Only required if it's a plain text message
    },
    mediaUrl: {
      type: String, // Base64 string for this clone
    },
    mediaName: {
      type: String, // E.g., 'document.pdf'
    },
    mediaSize: {
      type: Number, // File size in bytes
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
