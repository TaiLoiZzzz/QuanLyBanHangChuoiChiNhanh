const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./presentation/middlewares/authMiddleware');
const errorHandler = require('./presentation/middlewares/errorHandler');
const apiRoutes = require('./presentation/routes/apiRoutes');
const loginAttempts = new Map();

const app = express();

// Middlewares
const origins = (process.env.APP_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use(cors({ credentials: true, origin(origin, cb) { cb(null, !origin || origins.includes(origin)); } }));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && !origins.includes(origin) && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ success: false, error: 'Nguồn yêu cầu không hợp lệ.' });
    if (req.method !== 'DELETE' && !req.is('application/json')) return res.status(415).json({ success: false, error: 'Yêu cầu JSON.' });
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Security context injection
app.use(authMiddleware);

// Bound repeated native SQL login attempts before opening new connections.
app.use('/api/auth/login', (req,res,next) => {
  const now=Date.now();
  for(const [key, entry] of loginAttempts) if(entry.until<=now) loginAttempts.delete(key);
  const key=req.ip;const entry=loginAttempts.get(key)||{count:0,until:now+5*60*1000};
  entry.count++;loginAttempts.set(key,entry);
  if(entry.count>20 || loginAttempts.size>5000) return res.status(429).json({success:false,error:'Thử đăng nhập quá nhiều lần. Hãy đợi vài phút.'});
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Readiness reflects an actual SQL query, not a static ONLINE badge.
app.get('/health', async (req, res) => {
  try {
    const pool = await require('./infrastructure/database/SqlServerConnectionFactory').getPool();
    await pool.request().query('SELECT 1 AS ready');
    res.json({ status: 'ONLINE' });
  } catch { res.status(503).json({ status: 'UNAVAILABLE' }); }
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
