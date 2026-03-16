const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  // PostgreSQL errors
  if (err.code === '23505') {
    return res.status(400).json({ success: false, message: 'Duplicate entry: ' + err.detail });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced record not found: ' + err.detail });
  }
  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Constraint violation: ' + err.detail });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
