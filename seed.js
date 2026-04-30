require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Message = require('./models/Message');

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Message.deleteMany({});
    console.log('Data cleared.');

    // Create Users
    console.log('Creating users...');
    const usersData = [
      { username: 'Thiru', email: 'thiru@gmail.com', avatarColor: '#f44336', avatarLetter: 'T' },
      { username: 'Tushar', email: 'tushar@gmail.com', avatarColor: '#e91e63', avatarLetter: 'T' },
      { username: 'Praveen', email: 'praveen@gmail.com', avatarColor: '#9c27b0', avatarLetter: 'P' },
      { username: 'Sabeer', email: 'sabeer@gmail.com', avatarColor: '#673ab7', avatarLetter: 'S' },
      { username: 'Hari', email: 'hari@gmail.com', avatarColor: '#3f51b5', avatarLetter: 'H' },
    ];

    const createdUsers = await User.insertMany(usersData);
    console.log(`${createdUsers.length} users created.`);

    // Create Seed Messages
    console.log('Creating messages...');
    const messages = [];
    
    // Each user sends a message to everyone else
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = 0; j < createdUsers.length; j++) {
        if (i !== j) {
          messages.push({
            senderId: createdUsers[i]._id,
            receiverId: createdUsers[j]._id,
            text: `Hello ${createdUsers[j].username}, this is ${createdUsers[i].username}!`,
          });
        }
      }
    }

    await Message.insertMany(messages);
    console.log(`${messages.length} messages created.`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
