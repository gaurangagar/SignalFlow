const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const connectDB = require('./config/connectDB.js');
const { initializeSocket } = require('./config/socket.js');

const app = express();

const httpServer = http.createServer(app);
initializeSocket(httpServer);

app.use(cors());
app.use(express.json());
connectDB();

// Health Check Route
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Workers
require('./workers/email.worker.js');
require('./workers/fanout.worker.js');
require('./workers/inapp.worker.js');

const analyticsRoutes = require('./routes/analytics.routes.js');
const authRoutes = require('./routes/auth.route.js');
const notificationRoutes = require('./routes/notification.routes.js');
const userRoutes = require('./routes/user.route.js');

// Routes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
