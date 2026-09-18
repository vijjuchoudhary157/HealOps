const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const errorResponse = {
    error: {
      message,
      status
    }
  };

  // Only log the actual error for debugging, don't send to client
  if (status === 500) {
    console.error(JSON.stringify({
      level: 'error',
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    }));
  }

  res.status(status).json(errorResponse);
};

module.exports = errorHandler;
