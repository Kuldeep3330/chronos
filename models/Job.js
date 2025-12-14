const mongoose = require('mongoose');
const { Schema } = mongoose;

const JobSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['webhook', 'noop'], default: 'webhook' },
    cron: { type: String, default: null }, 
    delayUntil: { type: Date, default: null }, 
    payload: { type: Schema.Types.Mixed, default: {} },
    targetUrl: { type: String, default: null },
    meta: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['scheduled', 'running', 'completed', 'failed', 'cancelled'], default: 'scheduled' },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastRunAt: Date,
    nextRunAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);