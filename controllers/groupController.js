const Group = require('../models/Group');
const Message = require('../models/Message');

// @desc    Create a new group
// @route   POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description, members, adminId } = req.body;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: 'Please provide name and members' });
    }

    const group = await Group.create({
      name,
      description,
      admin: adminId,
      members: [...members, adminId] // Include admin in members
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'username avatarColor avatarLetter about')
      .populate('admin', 'username');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: 'Failed to create group' });
  }
};

// @desc    Get all groups for a user
// @route   GET /api/groups/:userId
const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await Group.find({
      members: { $in: [userId] }
    })
    .populate('members', 'username avatarColor avatarLetter about')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get groups' });
  }
};

module.exports = {
  createGroup,
  getUserGroups
};
