const { Queue, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');
const config = require('../config');

const connection = new IORedis(config.REDIS_URL);

const queue = new Queue(config.QUEUE_NAME, { connection });
// scheduler needed for delayed & repeatable jobs
new QueueScheduler(config.QUEUE_NAME, { connection });

module.exports = { queue, connection };