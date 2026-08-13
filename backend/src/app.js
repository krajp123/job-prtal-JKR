const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const { publicLimiter } = require('./middleware/rateLimiter');

const candidateRoutes = require('./routes/candidate.routes');
const recruiterRoutes = require('./routes/recruiter.routes');
const profileRoutes = require('./routes/profile.routes');
const jobRoutes = require('./routes/job.routes');
const companyRoutes = require('./routes/company.routes');
const applicationRoutes = require('./routes/application.routes');
const paymentRoutes = require('./routes/payment.routes');
const messageRoutes = require('./routes/message.routes');
const otpRoutes = require('./routes/otp.routes');
const referralRoutes = require('./routes/referral.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// ---- CORS: public frontend and admin frontend are allowed separately ----
// This means the admin panel's origin doesn't need to be exposed to the public
// frontend's bundle, and vice versa.
const allowedOrigins = [process.env.PUBLIC_FRONTEND_URL, process.env.ADMIN_FRONTEND_URL]
  .filter(Boolean)
  .reduce((origins, origin) => {
    origins.push(origin);

    if (origin.includes('localhost')) {
      origins.push(origin.replace('localhost', '127.0.0.1'));
      origins.push(origin.replace('localhost', '[::1]'));
    }

    return origins;
  }, []);

function isLocalLoopbackOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch (err) {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      const isAllowed = !origin || allowedOrigins.includes(origin);
      const isDevLoopback = process.env.NODE_ENV !== 'production' && isLocalLoopbackOrigin(origin);

      if (isAllowed || isDevLoopback) {
        callback(null, true);
      } else {
        console.warn('Blocked CORS origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---- Public API (job seekers + recruiters) ----
app.use('/api', publicLimiter);
app.use('/api/candidate', candidateRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/notifications', notificationRoutes);

// ---- Admin API - completely separate base path, own rate limits, own auth ----
// No route here is ever imported into or linked from the public frontend.
app.use('/admin-api', adminRoutes);

// ---- 404 fallback ----
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
