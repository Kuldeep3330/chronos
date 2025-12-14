const express = require('express');
const Job = require('../models/Job');
const Log = require('../models/Log');
const { queue } = require('../queue/queue');
const config = require('../config');
const { nextRunFromCron } = require('../utils/cronNext');

const router = express.Router();

// Create job
router.post('/', async (req, res) => {
  const body = req.body;
  try {
    const job = new Job(body);
    if (job.cron) job.nextRunAt = nextRunFromCron(job.cron);
    await job.save();

    // enqueue into Bull for scheduling
    if (job.cron) {
      await queue.add(job._id.toString(), { jobId: job._id }, {
        repeat: { cron: job.cron },
        removeOnComplete: true,
        attempts: job.maxAttempts
      });
    } else if (job.delayUntil) {
      const delay = new Date(job.delayUntil).getTime() - Date.now();
      await queue.add(job._id.toString(), { jobId: job._id }, { delay: Math.max(0, delay), removeOnComplete: true });
    } else {
      // immediate
      await queue.add(job._id.toString(), { jobId: job._id }, { removeOnComplete: true });
    }

    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List jobs with filters
router.get('/', async (req, res) => {
  const { status, limit = 50, skip = 0 } = req.query;
  const q = {};
  if (status) q.status = status;
  const jobs = await Job.find(q).sort({ createdAt: -1 }).skip(parseInt(skip)).limit(parseInt(limit));
  res.json(jobs);
});

// Get job
router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

// Update job (reschedule)
router.put('/:id', async (req, res) => {
  const updates = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  Object.assign(job, updates);
  if (job.cron) job.nextRunAt = nextRunFromCron(job.cron);
  await job.save();
  // Note: not updating existing repeat job in Bull here for simplicity.
  res.json(job);
});

// Delete / cancel
router.delete('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.status = 'cancelled';
  await job.save();
  // we could also remove from queue by name
  await queue.remove(job._id.toString());
  res.json({ ok: true });
});

// Retry a job manually
router.post('/:id/retry', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.status = 'scheduled';
  await job.save();
  await queue.add(job._id.toString(), { jobId: job._id });
  res.json({ ok: true });
});

// Get logs
router.get('/:id/logs', async (req, res) => {
  const logs = await Log.find({ jobId: req.params.id }).sort({ runAt: -1 }).limit(200);
  res.json(logs);
});

module.exports = router;
