const mongoose = require('mongoose');
const Status = require('../models/Status');
const User = require('../models/User');

// @desc    Create a new status
// @route   POST /api/status
// @access  Public
const createStatus = async (req, res) => {
  try {
    const { userId, mediaUrl, type, text } = req.body;

    if (!userId || !mediaUrl) {
      return res.status(400).json({ message: 'Please provide userId and mediaUrl' });
    }

    const status = await Status.create({
      userId,
      mediaUrl,
      type: type || 'image',
      text: text || '',
    });

    const populatedStatus = await Status.findById(status._id).populate('userId', 'username avatarColor avatarLetter profilePic');

    res.status(201).json(populatedStatus);
  } catch (error) {
    console.error("Error in createStatus:", error);
    res.status(500).json({ message: 'Failed to create status' });
  }
};

// @desc    Get all statuses from all users (last 24 hours)
// @route   GET /api/status
// @access  Public
const getStatuses = async (req, res) => {
  try {
    // Fetch all statuses created in the last 24 hours
    const statuses = await Status.find()
      .populate('userId', 'username avatarColor avatarLetter profilePic')
      .populate('views.userId', 'username profilePic')
      .sort({ createdAt: -1 });

    // Group statuses by user
    const groupedStatuses = {};
    statuses.forEach(status => {
      const userId = status.userId._id.toString();
      if (!groupedStatuses[userId]) {
        groupedStatuses[userId] = {
          user: status.userId,
          statuses: []
        };
      }
      groupedStatuses[userId].statuses.push(status);
    });

    res.status(200).json(Object.values(groupedStatuses));
  } catch (error) {
    console.error("Error in getStatuses:", error);
    res.status(500).json({ message: 'Failed to fetch statuses' });
  }
};

// @desc    Delete a status
// @route   DELETE /api/status/:id
// @access  Public
const deleteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const status = await Status.findById(id);
    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    if (status.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this status' });
    }

    await status.deleteOne();
    res.status(200).json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error("Error in deleteStatus:", error);
    res.status(500).json({ message: 'Failed to delete status' });
  }
};

// @desc    View a status
// @route   POST /api/status/view/:id
// @access  Public
const viewStatus = async (req, res) => {
  try {
    const { userId } = req.body;
    const status = await Status.findById(req.params.id);

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Don't count owner's view
    if (status.userId.toString() === userId) {
      return res.status(200).json(status);
    }

    // Use findOneAndUpdate with $addToSet for atomicity and duplicate prevention
    const updatedStatus = await Status.findOneAndUpdate(
      { _id: req.params.id, 'views.userId': { $ne: userId } },
      { $push: { views: { userId } } },
      { new: true }
    ).populate('views.userId', 'username profilePic');

    res.status(200).json(updatedStatus || status);
  } catch (error) {
    console.error("Error in viewStatus:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createStatus,
  getStatuses,
  deleteStatus,
  viewStatus
};
