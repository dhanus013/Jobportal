const {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { ddbDocClient } = require('../config/aws');
const config = require('../config/env');

const TABLE = config.dynamodb.tableName;
const VALID_STATUSES = ['Pending', 'Shortlisted', 'Rejected', 'Selected'];

/**
 * Creates a new application record.
 */
async function createApplication({ fullName, email, position, resumeKey, resumeUrl, resumeOriginalName }) {
  const item = {
    applicationId: uuidv4(),
    fullName,
    email,
    position,
    resumeKey, // S3 object key — needed to generate presigned download URLs later
    resumeUrl, // reference URL (not directly downloadable, bucket is private)
    resumeOriginalName,
    status: 'Pending',
    submittedAt: new Date().toISOString(),
  };

  await ddbDocClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
}

async function getApplicationById(applicationId) {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { applicationId },
    })
  );
  return result.Item || null;
}

/**
 * Returns all applications. DynamoDB Scan is fine at small/medium scale
 * (a few thousand records). For production scale, consider adding a
 * Global Secondary Index on `position` or `status` and using Query
 * instead of Scan, plus pagination via LastEvaluatedKey.
 */
async function listApplications() {
  const items = [];
  let ExclusiveStartKey;

  do {
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey,
      })
    );
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  // Most recent applications first
  items.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  return items;
}

async function updateApplicationStatus(applicationId, status) {
  if (!VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const result = await ddbDocClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { applicationId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      ConditionExpression: 'attribute_exists(applicationId)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

async function deleteApplication(applicationId) {
  await ddbDocClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { applicationId },
    })
  );
}

module.exports = {
  VALID_STATUSES,
  createApplication,
  getApplicationById,
  listApplications,
  updateApplicationStatus,
  deleteApplication,
};
