require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const jobs = require('./jobs/tournamentJobs'); // cron jobs

// DB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
