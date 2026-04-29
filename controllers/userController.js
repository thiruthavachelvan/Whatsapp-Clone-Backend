const User = require('../models/User');

const getRandomColor = () => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  const { username, email } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Please provide a username' });
  }

  let user = await User.findOne({ username });

  if (!user) {
    user = await User.create({
      username,
      email,
      avatarColor: getRandomColor(),
      avatarLetter: username.charAt(0).toUpperCase()
    });
  }

  res.status(200).json(user);
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
  try {
    const { userId } = req.query; // If we want to exclude current user
    
    let query = {};
    if (userId) {
      query._id = { $ne: userId };
    }
    
    const users = await User.find(query).select('-__v');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  loginUser,
  getUsers
};
