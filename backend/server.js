const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const applicationsRouter = require('./routes/applications');
const adminRouter = require('./routes/admin');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Behind Nginx on EC2 — needed for correct client IPs in rate limiting / logs
app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic abuse protection on the public submission endpoint
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/applications', submitLimiter, applicationsRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Job Portal API running on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = app;
