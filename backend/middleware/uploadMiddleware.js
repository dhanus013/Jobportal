const multer = require('multer');
const config = require('../config/env');

/**
 * Memory storage: files are buffered in RAM and streamed straight to S3
 * without ever touching the EC2 disk. Fine for resume-sized PDFs (a few MB).
 */
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const isPdf =
    file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return cb(new Error('Only PDF files are allowed for resume upload.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.s3.maxFileSizeBytes,
  },
});

module.exports = upload;
