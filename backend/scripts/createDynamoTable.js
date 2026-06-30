/**
 * One-time setup script: creates the DynamoDB table used by the
 * Job Application Portal if it does not already exist.
 *
 * Usage:
 *   npm run create-table
 *
 * This is safe to re-run — it checks for the table first and exits
 * quietly if it already exists.
 */
require('dotenv').config();
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} = require('@aws-sdk/client-dynamodb');

const config = require('../config/env');

const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.accessKeyId && {
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  }),
});

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') return false;
    throw err;
  }
}

async function main() {
  const tableName = config.dynamodb.tableName;

  if (await tableExists(tableName)) {
    console.log(`Table "${tableName}" already exists. Nothing to do.`);
    return;
  }

  console.log(`Creating table "${tableName}"...`);

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [{ AttributeName: 'applicationId', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'applicationId', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST', // on-demand, no capacity planning needed
    })
  );

  console.log(`Table "${tableName}" created successfully (PAY_PER_REQUEST mode).`);
  console.log(
    'Tip: for production at scale, add Global Secondary Indexes on "position" and "status" to support efficient Query-based filtering instead of Scan.'
  );
}

main().catch((err) => {
  console.error('Failed to create table:', err);
  process.exit(1);
});
