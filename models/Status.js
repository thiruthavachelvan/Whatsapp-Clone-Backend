const mongoose = require('mongoose');

const statusSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String, // Base64 string for this clone
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'text'],
      default: 'image',
    },
    text: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours in seconds
    },
    views: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        }
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Optimize status lookups
statusSchema.index({ user: 1 });

// The 'expires' option on createdAt already handles the TTL index
// statusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Status = mongoose.model('Status', statusSchema);

module.exports = Status;
