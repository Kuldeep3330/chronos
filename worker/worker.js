// Worker that processes queued jobs
const mongoose = require('mongoose');
const axios = require('axios');
const { Worker } = require('bullmq');
const config = require('../config');
const JobModel = require('../models/Job');
const Log = require('../models/Log');
const { connection } = require('../queue/queue');

async function connectDb() {
  await mongoose.connect(process.env.MONGO_URI || config.MONGO_URI);
  console.log('Worker connected to Mongo');
}

connectDb().catch(console.error);

const worker = new Worker(config.QUEUE_NAME, async (job) => {
  const jobId = job.data.jobId;
  const j = await JobModel.findById(jobId);
  if (!j) return { error: 'Job not found' };

  j.status = 'running';
  j.attempts = (j.attempts || 0) + 1;
  j.lastRunAt = new Date();
  await j.save();

  const start = Date.now();
  try {
    let resp = null;
    if (j.type === 'webhook' && j.targetUrl) {
      resp = await axios.post(j.targetUrl, { payload: j.payload }, { timeout: 15000 });
    }
    const duration = Date.now() - start;
    j.status = 'completed';
    j.nextRunAt = j.cron ? (function(){ try { const parser = require('cron-parser'); return parser.parseExpression(j.cron, { utc: true }).next().toDate(); } catch(e) { return null; } })() : null;
    await j.save();

    const log = new Log({ jobId: j._id, status: 'completed', message: `status ${resp ? resp.status : 'ok'}`, durationMs: duration });
    await log.save();
    return { ok: true };
  } catch (err) {
    const duration = Date.now() - start;
    j.status = 'failed';
    await j.save();
    const log = new Log({ jobId: j._id, status: 'failed', message: err.message, durationMs: duration });
    await log.save();
    throw err; // let Bull handle retries if configured
  }
}, { connection });

worker.on('completed', job => console.log('Job completed', job.id));
worker.on('failed', (job, err) => console.log('Job failed', job.id, err.message));

console.log('Worker started');
