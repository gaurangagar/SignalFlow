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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

const emailWorker = require('./workers/email.worker.js');
const fanoutWorker = require('./workers/fanout.worker.js');
const inappWorker = require('./workers/inapp.worker.js');
