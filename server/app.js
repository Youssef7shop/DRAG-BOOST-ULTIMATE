const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const servicesRoutes = require('./routes/services.routes');
const ordersRoutes = require('./routes/orders.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimiter);

// API Versioned Routes
app.use('/api/v1/health', (req, res) => res.status(200).json({ status: 'healthy', timestamp: new Date() }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(errorHandler);

module.exports = app;