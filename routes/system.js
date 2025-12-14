const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { connection: redis } = require('../queue/queue');

router.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 is connected
  let redisOk = true;
  try { await redis.ping(); } catch (e) { redisOk = false; }
  res.json({ db: dbState === 1, redis: redisOk, time: new Date() });
});

module.exports = router;