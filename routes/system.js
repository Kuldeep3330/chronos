const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { connection: redis } = require('../queue/queue');

router.get('/health', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;

  let redisOk = false;
  try {
    if (redis) {
      await redis.ping();
      redisOk = true;
    }
  } catch (err) {
    redisOk = false;
  }

  const status = dbOk && redisOk ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    db: dbOk,
    redis: redisOk,
    time: new Date().toISOString(),
  });
});

module.exports = router;
