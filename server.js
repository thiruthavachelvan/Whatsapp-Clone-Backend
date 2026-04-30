require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS configuration for both Express and Socket.io
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Store active users: userId -> socketId
const activeUsers = new Map();

// Socket.io integration
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user logs in and connects
  socket.on('addUser', (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('getUsers', Array.from(activeUsers.keys()));
  });

  // Handle sending message
  socket.on('sendMessage', ({ senderId, receiverId, text, isRead }) => {
    const receiverSocketId = activeUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('getMessage', {
        senderId,
        text,
        isRead: isRead || false,
        createdAt: new Date().toISOString()
      });
    }
  });

  // Handle marking messages as read
  socket.on('markMessagesRead', ({ senderId, receiverId }) => {
    const senderSocketId = activeUsers.get(senderId);
    
    if (senderSocketId) {
      io.to(senderSocketId).emit('messagesRead', {
        receiverId
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove user mapping
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    io.emit('getUsers', Array.from(activeUsers.keys()));
  });
});

app.get('/', (req, res) => {
  res.send('WhatsApp Web Clone API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
