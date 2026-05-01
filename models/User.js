const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: false,
    },
    avatarColor: {
      type: String,
      required: false,
    },
    avatarLetter: {
      type: String,
      required: false,
    },
    about: {
      type: String,
      default: 'Hey there! I am using WhatsApp.',
    },
    profilePic: {
      type: String,
      default: '',
    }
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
