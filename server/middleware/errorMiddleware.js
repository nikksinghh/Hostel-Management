// Handle 404 Route Not Found
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler with production sanitization
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format for field: ${err.path}`;
  }

  // Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = `Validation Error: ${errors.join(', ')}`;
  }

  // Handle Multer specific errors
  else if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'Uploaded file exceeds the maximum allowed size of 10MB.';
    } else {
      statusCode = 400;
      message = `Upload error: ${err.message}`;
    }
  } else if (err.message && err.message.startsWith('Unsupported file type')) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
