const { S3Client } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const config = require('./env');

/**
 * Build the credentials object only if explicit keys were provided.
 * If omitted, the AWS SDK v3 default credential provider chain takes
 * over automatically — this is what allows an EC2 IAM Role to "just work".
 */
const credentials =
  config.aws.accessKeyId && config.aws.secretAccessKey
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    : undefined;

const s3Client = new S3Client({
  region: config.aws.region,
  ...(credentials && { credentials }),
});

const ddbClient = new DynamoDBClient({
  region: config.aws.region,
  ...(credentials && { credentials }),
});

// Document client gives us a simpler, JSON-like API over raw DynamoDB
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

module.exports = { s3Client, ddbClient, ddbDocClient };
