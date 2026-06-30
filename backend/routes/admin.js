const express = require('express');
const dynamoService = require('../services/dynamoService');
const s3Service = require('../services/s3Service');

const router = express.Router();

/**
 * GET /api/admin/applications
 * Lists all applications. Supports optional query params:
 *   ?search=   - matches against fullName or email (case-insensitive)
 *   ?position= - exact match against position
 *   ?status=   - exact match against status
 *
 * NOTE: Filtering is done in-memory after a full table Scan. This is
 * acceptable for small/medium applicant volumes. For large-scale
 * production use, move filtering into DynamoDB Query against GSIs.
 */
router.get('/applications', async (req, res, next) => {
  try {
    const { search, position, status } = req.query;
    let applications = await dynamoService.listApplications();

    if (position) {
      applications = applications.filter((a) => a.position === position);
    }
    if (status) {
      applications = applications.filter((a) => a.status === status);
    }
    if (search) {
      const term = search.toLowerCase();
      applications = applications.filter(
        (a) => a.fullName.toLowerCase().includes(term) || a.email.toLowerCase().includes(term)
      );
    }

    res.json({ success: true, count: applications.length, applications });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/applications/:id/resume
 * Returns a short-lived presigned S3 URL so the admin can download
 * the candidate's resume without the bucket being publicly accessible.
 */
router.get('/applications/:id/resume', async (req, res, next) => {
  try {
    const application = await dynamoService.getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const downloadUrl = await s3Service.generateDownloadUrl(application.resumeKey, 300);
    res.json({ success: true, downloadUrl, expiresInSeconds: 300 });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/applications/:id/status
 * Body: { "status": "Shortlisted" | "Pending" | "Rejected" | "Selected" }
 */
router.patch('/applications/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required in request body.' });
    }

    const existing = await dynamoService.getApplicationById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const updated = await dynamoService.updateApplicationStatus(req.params.id, status);
    res.json({ success: true, message: 'Status updated.', application: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/applications/:id
 * Removes an application record (and its resume from S3).
 */
router.delete('/applications/:id', async (req, res, next) => {
  try {
    const existing = await dynamoService.getApplicationById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    await s3Service.deleteResume(existing.resumeKey);
    await dynamoService.deleteApplication(req.params.id);

    res.json({ success: true, message: 'Application deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
