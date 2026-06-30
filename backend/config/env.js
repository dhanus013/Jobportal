require('dotenv').config();

/**
 * Centralized configuration loaded from environment variables.
 * Fails fast if required values are missing so misconfiguration is
 * caught at startup rather than on the first request.
 */
const required = ['AWS_REGION', 'S3_BUCKET_NAME', 'DYNAMODB_TABLE_NAME'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[CONFIG ERROR] Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in the values before starting the server.'
  );
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  aws: {
    region: process.env.AWS_REGION,
    // If these are undefined, the AWS SDK falls back to its default
    // credential provider chain (IAM role, shared config file, etc.)
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
  },

  s3: {
    bucketName: process.env.S3_BUCKET_NAME,
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024,
  },

  dynamodb: {
    tableName: process.env.DYNAMODB_TABLE_NAME,
  },
};

module.exports = config;
