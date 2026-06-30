const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const { validateApplicationInput, ALLOWED_POSITIONS } = require('../middleware/validation');
const s3Service = require('../services/s3Service');
const dynamoService = require('../services/dynamoService');

const router = express.Router();

/**
 * GET /api/applications/positions
 * Returns the list of selectable job positions for the dropdown.
 */
router.get('/positions', (req, res) => {
  res.json({ success: true, positions: ALLOWED_POSITIONS });
});

/**
 * POST /api/applications
 * Submits a new job application: validates input, uploads resume to S3,
 * then writes the application record (including the S3 key) to DynamoDB.
 *
 * multipart/form-data fields:
 *   - fullName, email, position (text)
 *   - resume (file, PDF only)
 */
router.post('/', upload.single('resume'), async (req, res, next) => {
  try {
    const { fullName, email, position } = req.body;

    const errors = validateApplicationInput({ fullName, email, position });
    if (!req.file) {
      errors.push('Resume file (PDF) is required.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }

    // Use a temp id for the S3 key path so resume + DB record can be
    // correlated even though the DynamoDB applicationId is generated
    // after upload completes.
    const tempId = require('uuid').v4();

    const { key, referenceUrl } = await s3Service.uploadResume({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      applicationId: tempId,
    });

    const application = await dynamoService.createApplication({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      position: position.trim(),
      resumeKey: key,
      resumeUrl: referenceUrl,
      resumeOriginalName: req.file.originalname,
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application: {
        applicationId: application.applicationId,
        fullName: application.fullName,
        email: application.email,
        position: application.position,
        status: application.status,
        submittedAt: application.submittedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
