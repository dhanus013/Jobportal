const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { s3Client } = require('../config/aws');
const config = require('../config/env');

const BUCKET = config.s3.bucketName;

/**
 * Uploads a resume buffer to S3 under a unique, collision-proof key.
 * Returns both the S3 object key (used internally/for deletes) and a
 * stable "reference" URL (virtual-hosted style) for record-keeping.
 *
 * NOTE: Because the bucket should NOT be public, the stored URL is for
 * reference only. Actual downloads must go through generateDownloadUrl()
 * which creates a short-lived presigned URL.
 */
async function uploadResume({ buffer, originalName, mimeType, applicationId }) {
  const safeExt = path.extname(originalName).toLowerCase() || '.pdf';
  const key = `resumes/${applicationId}/${uuidv4()}${safeExt}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Bucket is private; access is only ever granted via presigned URLs.
      ServerSideEncryption: 'AES256',
      Metadata: {
        originalFilename: originalName,
        applicationId,
      },
    })
  );

  const referenceUrl = `https://${BUCKET}.s3.${config.aws.region}.amazonaws.com/${key}`;

  return { key, referenceUrl };
}

/**
 * Generates a time-limited presigned URL so the admin dashboard can
 * download a resume without the bucket needing to be public.
 */
async function generateDownloadUrl(key, expiresInSeconds = 300) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

async function deleteResume(key) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = { uploadResume, generateDownloadUrl, deleteResume };
