const express = require('express');
const Job = require('../models/Job');
const Log = require('../models/Log');
const { queue } = require('../queue/queue');
const { nextRunFromCron } = require('../utils/cronNext');

const router = express.Router();
const JOB_NAME = 'execute-job';

/**
 * Create job
 */
router.post('/', async (req, res) => {
  try {
    const job = new Job(req.body);

    if (job.cron) {
      job.nextRunAt = nextRunFromCron(job.cron);
    }

    await job.save();

    const jobOptions = {
      jobId: job._id.toString(),
      removeOnComplete: true,
      removeOnFail: false,
      attempts: job.maxAttempts,
    };

    if (job.cron) {
      await queue.add(
        JOB_NAME,
        { jobId: job._id.toString() },
        {
          ...jobOptions,
          repeat: { cron: job.cron },
        }
      );
    } else if (job.delayUntil) {
      const delay = Math.max(
        0,
        new Date(job.delayUntil).getTime() - Date.now()
      );

      await queue.add(JOB_NAME, { jobId: job._id.toString() }, {
        ...jobOptions,
        delay,
      });
    } else {
      await queue.add(JOB_NAME, { jobId: job._id.toString() }, jobOptions);
    }

    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * List jobs (hide cancelled by default)
 */
router.get('/', async (req, res) => {
  const { status, limit = 50, skip = 0 } = req.query;

  const query = status
    ? { status }
    : { status: { $ne: 'cancelled' } };

  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));

  res.json(jobs);
});

/**
 * Get job
 */
router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

/**
 * Update job metadata (does not reschedule)
 */
router.put('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  Object.assign(job, req.body);

  if (job.cron) {
    job.nextRunAt = nextRunFromCron(job.cron);
  }

  await job.save();
  res.json(job);
});

/**
 * Cancel job (soft delete)
 */
router.delete('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  job.status = 'cancelled';
  await job.save();

  // Remove waiting / delayed job
  await queue.remove(job._id.toString());

  // Remove repeatable job
  if (job.cron) {
    const repeatables = await queue.getRepeatableJobs();
    const repeat = repeatables.find(r => r.id === job._id.toString());
    if (repeat) {
      await queue.removeRepeatableByKey(repeat.key);
    }
  }

  res.json({ ok: true });
});

/**
 * Retry job manually
 */
router.post('/:id/retry', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  job.status = 'scheduled';
  await job.save();

  await queue.add(
    JOB_NAME,
    { jobId: job._id.toString() },
    {
      jobId: job._id.toString(),
      removeOnComplete: true,
      attempts: job.maxAttempts,
    }
  );

  res.json({ ok: true });
});

/**
 * Job logs
 */
router.get('/:id/logs', async (req, res) => {
  const logs = await Log.find({ jobId: req.params.id })
    .sort({ runAt: -1 })
    .limit(200);

  res.json(logs);
});

module.exports = router;
