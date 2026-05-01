require('dotenv').config(); // Trigger restart
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');

// Connect to database
connectDB();

// Register Models
require('./models/User');
require('./models/Group');
require('./models/Message');

const app = express();
const server = http.createServer(app);

// CORS configuration for both Express and Socket.io
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});

// Make io accessible in routes
app.set('socketio', io);
// Store active users: userId -> socketId
const activeUsers = new Map();
app.set('activeUsers', activeUsers);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

// Socket.io integration
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user logs in and connects
  socket.on('addUser', (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('getUsers', Array.from(activeUsers.keys()));
  });

  // Handle sending message
  socket.on('sendMessage', (data) => {
    const { senderId, receiverId, groupId, text, senderInfo } = data;
    
    if (groupId) {
      // Group Message: Broadcast to everyone (clients will filter if they are members)
      // Ideally, we'd use rooms, but for now simple broadcast is faster to implement
      socket.broadcast.emit('getMessage', {
        ...data,
        createdAt: new Date().toISOString()
      });
    } else {
      // Private Message
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('getMessage', {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
    }
  });

  // Handle group creation
  socket.on('createGroup', (groupData) => {
    socket.broadcast.emit('groupCreated', groupData);
  });

  // Handle marking messages as read
  socket.on('markMessagesRead', ({ senderId, receiverId }) => {
    const senderSocketId = activeUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messagesRead', { receiverId });
    }
  });

  // Handle user profile updates
  socket.on('updateUser', (updatedUser) => {
    socket.broadcast.emit('userUpdated', updatedUser);
  });

  // Handle message deletion (for everyone)
  socket.on('deleteMessage', ({ messageId, chatId }) => {
    // Broadcast to all other connected sockets (receiver will apply it if in the same chat)
    socket.broadcast.emit('messageDeleted', { messageId, chatId });
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
