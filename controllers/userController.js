const User = require('../models/User');

const getRandomColor = () => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please provide an email to login' });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: 'User not found. Please create an account.' });
  }

  res.status(200).json(user);
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ message: 'Please provide both username and email' });
  }

  // Check if email or username already exists
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: 'Email is already in use' });
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res.status(400).json({ message: 'Username is already taken' });
  }

  const user = await User.create({
    username,
    email,
    avatarColor: getRandomColor(),
    avatarLetter: username.charAt(0).toUpperCase()
  });

  res.status(201).json(user);
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
  try {
    const { userId } = req.query; // The ID of the currently logged-in user
    
    let query = {};
    if (userId) {
      query._id = { $ne: userId };
    }
    
    const users = await User.find(query).select('-__v').lean();
    
    // If userId is provided, calculate unread counts for each contact
    if (userId) {
      const Message = require('../models/Message');
      
      const usersWithCounts = await Promise.all(users.map(async (user) => {
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: userId,
          isRead: false
        });
        return { ...user, unreadCount };
      }));
      
      return res.status(200).json(usersWithCounts);
    }
    
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  loginUser,
  registerUser,
  getUsers
};
