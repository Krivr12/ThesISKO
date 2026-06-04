/**
 * AWS S3 Connection Test
 * Tests S3 bucket access and permissions
 */

import { S3Client, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../config.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testS3Connection() {
  console.log('\n🔍 Testing AWS S3 Connection...');
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log('✅ S3 connection successful');
    console.log(`   Found ${response.Buckets.length} bucket(s)`);
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    return false;
  }
}

async function testBucketAccess(bucketName, bucketLabel) {
  console.log(`\n🔍 Testing ${bucketLabel} access...`);
  try {
    const command = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(command);
    console.log(`✅ ${bucketLabel} accessible`);
    console.log(`   Bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`❌ ${bucketLabel} access failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 AWS S3 CONNECTION TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const s3Success = await testS3Connection();
  
  let repositorySuccess = true;
  let tempSuccess = true;

  if (s3Success) {
    repositorySuccess = await testBucketAccess(
      process.env.THESISKO_REPOSITORY_BUCKET,
      'Repository Bucket'
    );
    tempSuccess = await testBucketAccess(
      process.env.THESISKO_TEMPORARY_BUCKET,
      'Temporary Bucket'
    );
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`S3 Connection:     ${s3Success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Repository Bucket: ${repositorySuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Temporary Bucket:  ${tempSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allPassed = s3Success && repositorySuccess && tempSuccess;
  process.exit(allPassed ? 0 : 1);
}

runTests();
