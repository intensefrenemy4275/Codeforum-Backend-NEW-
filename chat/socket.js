const { Server } = require('socket.io');
const User = require('../models/user');
const ChatMessage = require('../models/chatMessage');

function initializeChat(server, redis) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('joinRoom', async ({ currentUserId, otherUserId }) => {
      const [userA, userB] = await Promise.all([
        User.findById(currentUserId, 'progress.following'),
        User.findById(otherUserId, 'progress.followers')
      ]);
      if (!userA || !userB) {
        socket.emit('chatDenied', 'User not found');
        return;
      }
      const aFollowsB = userA.progress.following.map(String).includes(otherUserId);
      const bFollowsA = userB.progress.followers.map(String).includes(currentUserId);
      if (aFollowsB && bFollowsA) {
        const roomId = [currentUserId, otherUserId].sort().join('_');
        socket.join(roomId);

        // Try Redis FIRST
        let cached = await redis.get(`chat:${roomId}`);
        let chatHistory;
        if (cached) {
          chatHistory = JSON.parse(cached);
        } else {
          // If missing, fill from MongoDB
          const mongoMessages = await ChatMessage.find({ roomId })
            .sort({ createdAt: 1 })
            .lean();
          chatHistory = mongoMessages.map(msg => ({
            from: msg.from,
            to: msg.to,
            text: msg.text,
            createdAt: msg.createdAt,
          }));
          await redis.set(`chat:${roomId}`, JSON.stringify(chatHistory), 'EX', 3600);
        }
        socket.emit('chatHistory', chatHistory);
      } else {
        socket.emit('chatDenied', 'You must follow each other to chat');
      }
    });

    socket.on('chatMessage', async ({ roomId, from, to, text }) => {
      const message = { from, to, text, createdAt: new Date() };
      io.to(roomId).emit('chatMessage', message);

      // Save to MongoDB (permanent)
      await ChatMessage.create({
        roomId,
        from,
        to,
        text
      });

      // Save to Redis (fast loading)
      let cached = await redis.get(`chat:${roomId}`);
      let chatHistory = cached ? JSON.parse(cached) : [];
      chatHistory.push(message);
      if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100);
      await redis.set(`chat:${roomId}`, JSON.stringify(chatHistory), 'EX', 3600);
    });

  });

  console.log('Socket.io chat initialized');
}

module.exports = { initializeChat };
