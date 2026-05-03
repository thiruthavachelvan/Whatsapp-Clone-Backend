const mongoose = require('mongoose');

const connectDB = async (retryCount = 5) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/whatsapp-clone');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (retryCount > 0) {
      console.log(`Retrying connection in 5 seconds... (${retryCount} retries left)`);
      setTimeout(() => connectDB(retryCount - 1), 5000);
    } else {
      console.error('Failed to connect to MongoDB after multiple attempts. Exiting...');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
