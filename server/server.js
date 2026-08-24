const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/connectDB.js');

const app = express();

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