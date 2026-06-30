const multer = require('multer');

/**
 * Catches errors thrown/forwarded from anywhere in the request pipeline
 * and returns a consistent JSON error shape. Must be registered LAST,
 * after all routes, in server.js.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Resume file is too large.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  // Errors explicitly thrown with a custom statusCode (e.g. validation)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err.message && err.message.toLowerCase().includes('only pdf files')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
