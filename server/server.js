const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const allocationRoutes = require('./routes/allocations');

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'https://hostel-management-1aq2w3yux-nikhils-projects-8f508638.vercel.app',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser clients
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/hostel_management');
if (!mongoUri) {
  console.error('Missing MONGODB_URI environment variable in production');
  process.exit(1);
}
mongoose.connect(mongoUri);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  try {
    const info = mongoose.connection;
    console.log(`Connected to MongoDB (db: ${info.name}, host: ${info.host})`);
  } catch {
    console.log('Connected to MongoDB');
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);

// Health/landing route (works for API-only deploys)
app.get('/', (req, res) => {
  res.json({ message: 'Hostel Management API is running!' });
});

// Health endpoint to check DB connectivity
app.get('/healthz', (req, res) => {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ status: 'ok', db: states[state] || String(state) });
});

// If frontend build exists, serve it and enable SPA fallback
const distPath = path.join(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;