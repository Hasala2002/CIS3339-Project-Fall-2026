// Errors the routes throw on purpose, and the one place that turns any error into { error: "message" }

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// anything that gets past every route is an unknown url
const notFound = (req, res, next) => next(new HttpError(404, 'Not found'));

// registered after all the routes. next has to be in the arguments or express won't treat this as an error handler
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    // mongoose says "Path `firstName` is required.", turn that into "firstName is required"
    message = Object.values(err.errors)
      .map((e) => e.message.replace(/^Path `(.+?)` /, '$1 ').replace(/\.$/, ''))
      .join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = ['_id', 'attendees', 'services'].includes(err.path) ? 'Invalid id' : `Invalid ${err.path}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists';
  }

  // log the real error here but never send stack traces or mongo details back
  if (status >= 500) {
    console.error(err);
    message = 'Something went wrong on the server';
  }
  res.status(status).json({ error: message });
};

module.exports = { HttpError, notFound, errorHandler };
