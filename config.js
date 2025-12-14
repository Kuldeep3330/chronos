module.exports = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/chronos',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PORT: process.env.PORT || 4000,
  QUEUE_NAME: 'chronos-jobs'
};