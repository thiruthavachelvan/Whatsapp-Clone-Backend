require('dotenv').config();
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
const Group = require('./models/Group');
require('./models/Message');
require('./models/Status');

const app = express();
const server = http.createServer(app);

// CORS configuration for both Express and Socket.io
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const io = new Server(server, {
  cors: corsOptions,
  // Optimization: prefer WebSocket, fall back to polling only if needed
  transports: ['websocket', 'polling'],
  // Reduce ping interval for faster disconnect detection
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Make io accessible in routes
app.set('socketio', io);
// Store active users: userId -> socketId
const activeUsers = new Map();
app.set('activeUsers', activeUsers);

// Routes
const statusRoutes = require('./routes/statusRoutes');
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/status', statusRoutes);

// Socket.io integration
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user logs in and connects
  socket.on('addUser', async (userId) => {
    activeUsers.set(userId, socket.id);
    
    // OPTIMIZATION: Join Socket.IO rooms for each group the user belongs to.
    // This replaces broadcast.emit (sends to ALL) with targeted room emission.
    try {
      const userGroups = await Group.find({ members: userId }, '_id').lean();
      userGroups.forEach(group => {
        socket.join(group._id.toString());
      });
    } catch (err) {
      console.error('Error joining group rooms:', err.message);
    }
    
    io.emit('getUsers', Array.from(activeUsers.keys()));
  });

  // Handle sending message
  socket.on('sendMessage', (data) => {
    const { receiverId, groupId } = data;
    const messagePayload = { ...data, createdAt: new Date().toISOString() };
    
    if (groupId) {
      // OPTIMIZATION: Emit to room (group members only), not broadcast to everyone.
      // Old: socket.broadcast.emit → sends to all ~N users
      // New: io.to(room).emit → sends only to ~group.members users
      socket.to(groupId.toString()).emit('getMessage', messagePayload);
    } else {
      // Private Message: direct targeted emit
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('getMessage', messagePayload);
      }
    }
  });

  // Handle group creation — join the new room immediately
  socket.on('createGroup', (groupData) => {
    // Creator joins the new group room
    socket.join(groupData._id.toString());
    // Notify other members (they will join via their next addUser event)
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
    socket.broadcast.emit('messageDeleted', { messageId, chatId });
  });

  // Handle poll vote updates in group chats via rooms
  socket.on('voteUpdate', ({ messageId, poll, groupId }) => {
    if (groupId) {
      socket.to(groupId.toString()).emit('voteUpdate', { messageId, poll });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
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
