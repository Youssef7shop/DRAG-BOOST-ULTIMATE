/**
 * DRAG BOOST — health check routes
 * Safe, unauthenticated endpoint for load balancers and monitoring.
 * Never returns secrets or internal system details.
 */
'use strict');

const express = require('express');
const config = require('../../config/env');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: config.appName,
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;