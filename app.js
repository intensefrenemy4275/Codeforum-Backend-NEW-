const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const chatRoutes = require('./routes/chat');
const Redis = require('ioredis');
const http = require('http');
require('dotenv').config();
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/feed', feedRoutes);
app.use('/chat', chatRoutes);
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

const server = http.createServer(app);

mongoose
  .connect(process.env.MONGODB_URL, { dbName: 'CodeForum_DB' })
  .then((result) => {
    console.log('DataBase Connected');
    // SOCKET.IO: Initialize here
    const { initializeChat } = require('./chat/socket');
    initializeChat(server, redis);
    server.listen(8080, () => {
      console.log('Server (with WebSocket) running on port 8080');
    });
  })
  .catch((err) => console.log(err));

const redis = new Redis(process.env.REDIS_URL); 

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
