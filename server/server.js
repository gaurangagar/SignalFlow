const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const connectDB = require('./config/connectDB.js');
const { initializeSocket } = require('./config/socket.js');

const analyticsRoutes = require('./routes/analytics.route.js');
const authRoutes = require('./routes/auth.route.js');
const notificationRoutes = require('./routes/notification.route.js');
const userRoutes = require('./routes/user.route.js');

// Workers
require('./workers/email.worker.js');
require('./workers/fanout.worker.js');
require('./workers/inapp.worker.js');

const app = express();

const httpServer = http.createServer(app);

initializeSocket(httpServer);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));

// Health Check Route
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// Routes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

// Database Connection & Server Startup
const PORT = process.env.PORT || 3000;

const startServer = () => {
  try {
    connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();