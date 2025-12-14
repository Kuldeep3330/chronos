const mongoose = require('mongoose');
const { Schema } = mongoose;

const LogSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  status: { type: String },
  message: { type: String },
  runAt: { type: Date, default: Date.now },
  durationMs: Number,
  meta: Schema.Types.Mixed
});

module.exports = mongoose.model('Log', LogSchema);