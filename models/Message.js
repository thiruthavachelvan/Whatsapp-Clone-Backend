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
      enum: ['text', 'image', 'video', 'document', 'audio', 'poll'],
      default: 'text'
    },
    text: {
      type: String,
      required: false,
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
    poll: {
      question: String,
      options: [
        {
          text: String,
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            }
          ]
        }
      ]
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

// Optimize performance with indexes
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });
messageSchema.index({ groupId: 1 });
messageSchema.index({ createdAt: -1 });
// Compound indexes for faster chat loading
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
