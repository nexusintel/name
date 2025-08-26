
import AppError from '../utils/AppError.js';

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: "${value}". Please use another value.`;
  return new AppError(message, 409); // 409 Conflict
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // MongoDB CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  
  // MongoDB Duplicate Key Error
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  // For unexpected errors, log them and send a generic message
  console.error('UNHANDLED ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred on the server.',
  });
};

export default errorHandler;