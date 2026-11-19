// This is the main file for the backend

// import functionalities
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./errors');

const cors = require('cors');
// allow using a .env file
require('dotenv').config(); //require the dotenv

// don't start with a half empty config, say what's missing instead
const missing = ['MONGO_URL', 'ORG_ID', 'JWT_SECRET', 'CORS_ORIGIN'].filter(
  (name) => !process.env[name]
);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')}, check your backend/.env`);
  process.exit(1);
}

// creates a new instance of express application
const app = express();

// only the frontend we configured is allowed to call the api from a browser
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
  })
);

// suppress mongoose warning to prepare for new version
mongoose.set('strictQuery', false);

// sets up mongoose for the mongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Database connection Success!');
  })
  .catch((err) => {
    console.error('Mongo Connection Error', err);
  });

// declare port number for the api
const PORT = process.env.PORT || 3000;

// setup and access request body
app.use(express.json());
app.use(morgan('dev'));

// no login needed, handy for checking a deployment is alive
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// setup middle ware for routes
app.use('/clients', require('./routes/clients'));
app.use('/events', require('./routes/events'));
app.use('/org', require('./routes/org'));
app.use('/services', require('./routes/services'));
app.use('/users', require('./routes/users'));

// these two have to come after every route
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
