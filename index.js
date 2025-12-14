const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');
const jobsRouter = require('./routes/jobs');
const systemRouter = require('./routes/system');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/jobs', jobsRouter);
app.use('/system', systemRouter);

// ✅ Modern Mongoose connection (NO deprecated options)
mongoose
  .connect(config.MONGO_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo error', err));

const port = config.PORT;
app.listen(port, () => console.log(`API listening on ${port}`));
