/**
 * Glacier Service for ThesISKO
 * 
 * Handles automatic transition of old documents (5+ years) to S3 Glacier Instant Retrieval storage class.
 * Also handles reversibility - restoring documents back to Standard storage when they become active again.
 * 
 * Features:
 * - Weekly routine check for old documents
 * - Batch processing to avoid overwhelming S3
 * - Error handling with retry logic
 * - Reversibility support
 */

import s3 from "../databaseConnections/AWS/s3_connection.js";
import { CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import db from "../databaseConnections/MongoDB/mongodb_connection.js";

const recordsCollection = db.collection("records");
const BATCH_SIZE = 15; // Process 15 documents at a time
const STORAGE_CLASS_GLACIER = "GLACIER_IR"; // Glacier Instant Retrieval
const STORAGE_CLASS_STANDARD = "STANDARD";

/**
 * Extract all file keys from a document's files object
 * @param {Object} doc - MongoDB document from records collection
 * @returns {Array<{key: string, bucket: string}>} Array of file info objects
 */
function extractAllFileKeys(doc) {
  const fileKeys = [];
  
  if (!doc.files || typeof doc.files !== 'object') {
    console.warn(`⚠️ Document ${doc._id} has no files object`);
    return fileKeys;
  }

  // Iterate through files object
  Object.entries(doc.files).forEach(([fileId, fileData]) => {
    if (!fileData || typeof fileData !== 'object') {
      return;
    }

    // Check for file_key or s3_key
    const fileKey = fileData.file_key || fileData.s3_key;
    if (fileKey && typeof fileKey === 'string') {
      const bucket = detectBucketFromKey(fileKey);
      fileKeys.push({
        fileId,
        key: fileKey,
        bucket: bucket
      });
    }
  });

  return fileKeys;
}

/**
 * Detect which S3 bucket a file belongs to based on its key pattern
 * @param {string} key - S3 object key
 * @returns {string} Bucket name
 */
function detectBucketFromKey(key) {
  if (key.startsWith('submission/')) {
    return process.env.THESISKO_DOCUMENTS_BUCKET;
  } else if (key.startsWith('repository-files/')) {
    return process.env.THESISKO_REPOSITORY_BUCKET;
  } else {
    // Default to repository bucket for safety
    console.warn(`⚠️ Unknown key pattern: ${key}, defaulting to repository bucket`);
    return process.env.THESISKO_REPOSITORY_BUCKET;
  }
}

/**
 * Check current storage class of an S3 object
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<string|null>} Storage class or null if error
 */
async function getStorageClass(bucket, key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    const response = await s3.send(command);
    // StorageClass can be null/undefined for STANDARD, or a string like 'GLACIER_IR', 'GLACIER', etc.
    const storageClass = response.StorageClass;
    
    // Normalize storage class values
    if (!storageClass || storageClass === 'STANDARD') {
      return 'STANDARD';
    }
    // Handle variations of Glacier storage classes
    if (storageClass.includes('GLACIER') || storageClass.includes('DEEP_ARCHIVE')) {
      return storageClass; // Return as-is (GLACIER_IR, GLACIER, DEEP_ARCHIVE, etc.)
    }
    return storageClass;
  } catch (error) {
    console.error(`❌ Error checking storage class for ${key}:`, error.message);
    return null;
  }
}

/**
 * Transition a single file to Glacier Instant Retrieval
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
async function transitionFileToGlacier(bucket, key) {
  try {
    // Check if already in Glacier
    const currentStorageClass = await getStorageClass(bucket, key);
    if (currentStorageClass && (currentStorageClass === STORAGE_CLASS_GLACIER || currentStorageClass.includes('GLACIER'))) {
      console.log(`  ℹ️ File ${key} already in Glacier (${currentStorageClass}), skipping`);
      return true;
    }

    // Copy object to itself with Glacier storage class
    // Note: CopyObjectCommand to the same key with a different StorageClass updates the storage class in place
    // This effectively replaces the object with the new storage class - no separate deletion needed
    console.log(`  🔄 Transitioning ${key} to ${STORAGE_CLASS_GLACIER}...`);
    
    try {
      await s3.send(
        new CopyObjectCommand({
          CopySource: `${bucket}/${key}`,
          Bucket: bucket,
          Key: key,
          StorageClass: STORAGE_CLASS_GLACIER,
          MetadataDirective: 'COPY' // Preserve metadata
        })
      );
      
      // Wait a moment for S3 to process the storage class change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the transition succeeded by checking storage class (retry up to 3 times)
      let newStorageClass = null;
      let retries = 3;
      while (retries > 0) {
        newStorageClass = await getStorageClass(bucket, key);
        // Check if storage class is any Glacier variant
        if (newStorageClass && (newStorageClass === STORAGE_CLASS_GLACIER || 
            newStorageClass.includes('GLACIER') || 
            newStorageClass === 'GLACIER_IR')) {
          console.log(`  ✅ Successfully transitioned ${key} to Glacier (${newStorageClass})`);
          return true;
        }
        retries--;
        if (retries > 0) {
          console.log(`  ⏳ Waiting for storage class update... (current: ${newStorageClass || 'STANDARD'}, ${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.error(`  ❌ Failed to verify Glacier transition for ${key} (current: ${newStorageClass || 'unknown'}, expected: ${STORAGE_CLASS_GLACIER})`);
      return false;
    } catch (copyError) {
      console.error(`  ❌ CopyObjectCommand failed for ${key}:`, copyError.message);
      // Check if it's a permissions issue
      if (copyError.name === 'AccessDenied' || copyError.message.includes('Access Denied')) {
        console.error(`  ⚠️ Permission denied - ensure IAM role has s3:PutObject and s3:PutObjectTagging permissions`);
      }
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error transitioning ${key} to Glacier:`, error.message);
    return false;
  }
}

/**
 * Transition a single file back to Standard storage
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
async function transitionFileToStandard(bucket, key) {
  try {
    // Check if already in Standard
    const currentStorageClass = await getStorageClass(bucket, key);
    if (currentStorageClass === STORAGE_CLASS_STANDARD || !currentStorageClass) {
      console.log(`  ℹ️ File ${key} already in Standard, skipping`);
      return true;
    }

    // Copy object with Standard storage class
    console.log(`  🔄 Restoring ${key} to ${STORAGE_CLASS_STANDARD}...`);
    await s3.send(
      new CopyObjectCommand({
        CopySource: `${bucket}/${key}`,
        Bucket: bucket,
        Key: key,
        StorageClass: STORAGE_CLASS_STANDARD,
        MetadataDirective: 'COPY'
      })
    );

    // Verify the copy succeeded
    const newStorageClass = await getStorageClass(bucket, key);
    if (newStorageClass === STORAGE_CLASS_STANDARD || !newStorageClass) {
      console.log(`  ✅ Successfully restored ${key} to Standard`);
      return true;
    } else {
      console.error(`  ❌ Failed to verify Standard restoration for ${key} (current: ${newStorageClass})`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error restoring ${key} to Standard:`, error.message);
    return false;
  }
}

/**
 * Transition all files for a document to Glacier
 * @param {Object} doc - MongoDB document
 * @returns {Promise<{success: boolean, filesProcessed: number, filesSucceeded: number}>}
 */
async function transitionDocumentToGlacier(doc) {
  const fileKeys = extractAllFileKeys(doc);
  
  if (fileKeys.length === 0) {
    console.log(`  ⚠️ Document ${doc._id} has no files to transition`);
    return { success: true, filesProcessed: 0, filesSucceeded: 0 };
  }

  console.log(`  📄 Processing ${fileKeys.length} file(s) for document ${doc._id}`);

  let filesSucceeded = 0;
  const errors = [];

  for (const fileInfo of fileKeys) {
    const success = await transitionFileToGlacier(fileInfo.bucket, fileInfo.key);
    if (success) {
      filesSucceeded++;
    } else {
      errors.push({ fileId: fileInfo.fileId, key: fileInfo.key, error: 'Transition failed' });
    }
  }

  const allSucceeded = filesSucceeded === fileKeys.length;

  if (!allSucceeded) {
    console.error(`  ⚠️ Some files failed to transition: ${filesSucceeded}/${fileKeys.length} succeeded`);
    errors.forEach(err => {
      console.error(`    - ${err.key}: ${err.error}`);
    });
  }

  return {
    success: allSucceeded,
    filesProcessed: fileKeys.length,
    filesSucceeded: filesSucceeded,
    errors: errors
  };
}

/**
 * Restore all files for a document to Standard storage
 * @param {Object} doc - MongoDB document
 * @returns {Promise<{success: boolean, filesProcessed: number, filesSucceeded: number}>}
 */
async function restoreDocumentToStandard(doc) {
  const fileKeys = extractAllFileKeys(doc);
  
  if (fileKeys.length === 0) {
    console.log(`  ⚠️ Document ${doc._id} has no files to restore`);
    return { success: true, filesProcessed: 0, filesSucceeded: 0 };
  }

  console.log(`  📄 Processing ${fileKeys.length} file(s) for document ${doc._id}`);

  let filesSucceeded = 0;
  const errors = [];

  for (const fileInfo of fileKeys) {
    const success = await transitionFileToStandard(fileInfo.bucket, fileInfo.key);
    if (success) {
      filesSucceeded++;
    } else {
      errors.push({ fileId: fileInfo.fileId, key: fileInfo.key, error: 'Restoration failed' });
    }
  }

  const allSucceeded = filesSucceeded === fileKeys.length;

  if (!allSucceeded) {
    console.error(`  ⚠️ Some files failed to restore: ${filesSucceeded}/${fileKeys.length} succeeded`);
    errors.forEach(err => {
      console.error(`    - ${err.key}: ${err.error}`);
    });
  }

  return {
    success: allSucceeded,
    filesProcessed: fileKeys.length,
    filesSucceeded: filesSucceeded,
    errors: errors
  };
}

/**
 * Check and update document_status for documents that have become 5 years old
 * This ensures documents that were "active" when archived get updated to "old" when they age
 * @returns {Promise<Object>} Summary of processing
 */
export async function checkAndUpdateDocumentStatus() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 DOCUMENT STATUS UPDATE CHECK STARTED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 5;

    // Find documents that are active but should be old (year <= cutoffYear)
    const query = {
      document_status: 'active',
      year: { $lte: cutoffYear }
    };

    const documentsToUpdate = await recordsCollection.find(query).toArray();
    const totalDocuments = documentsToUpdate.length;

    console.log(`📋 Found ${totalDocuments} document(s) that need status update to 'old'`);
    console.log(`📅 Cutoff year: ${cutoffYear} (documents with year <= ${cutoffYear} are considered old)`);

    if (totalDocuments === 0) {
      console.log('✅ No documents need status update. All up to date!');
      return {
        success: true,
        totalDocuments: 0,
        updated: 0
      };
    }

    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Update documents
    for (const doc of documentsToUpdate) {
      try {
        const age = currentYear - doc.year;
        await recordsCollection.updateOne(
          { _id: doc._id },
          {
            $set: {
              document_status: 'old',
              updated_at: new Date()
            }
          }
        );
        updatedCount++;
        console.log(`  ✅ Document ${doc._id}: year=${doc.year}, age=${age}, status updated to 'old'`);
      } catch (error) {
        console.error(`  ❌ Error updating document ${doc._id}:`, error.message);
        errorCount++;
        errors.push({ _id: doc._id, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOCUMENT STATUS UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} document(s)`);
    console.log(`❌ Errors: ${errorCount} document(s)`);
    console.log(`📋 Total documents found: ${totalDocuments}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS DETAILS:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Document ${error._id}: ${error.error}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: errorCount === 0,
      totalDocuments: totalDocuments,
      updated: updatedCount,
      errors: errors
    };
  } catch (error) {
    console.error('💥 Document status update check failed:', error);
    throw error;
  }
}

/**
 * Check and transition old documents to Glacier
 * Main routine function to be called by cron job
 * @returns {Promise<Object>} Summary of processing
 */
export async function checkAndTransitionOldDocuments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧊 GLACIER TRANSITION CHECK STARTED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find documents that are old but not yet transitioned
    const query = {
      document_status: 'old',
      $or: [
        { glacier_transitioned_at: { $exists: false } },
        { glacier_transitioned_at: null },
        { glacier_transition_status: { $in: ['pending', 'failed'] } }
      ]
    };

    const oldDocuments = await recordsCollection.find(query).toArray();
    const totalDocuments = oldDocuments.length;

    console.log(`📋 Found ${totalDocuments} document(s) that need Glacier transition`);

    if (totalDocuments === 0) {
      console.log('✅ No documents need transition. All up to date!');
      return {
        success: true,
        totalDocuments: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
      };
    }

    // Process in batches
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const failedDocuments = [];

    for (let i = 0; i < oldDocuments.length; i += BATCH_SIZE) {
      const batch = oldDocuments.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(oldDocuments.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} document(s))`);

      for (const doc of batch) {
        try {
          // Mark as processing
          await recordsCollection.updateOne(
            { _id: doc._id },
            {
              $set: {
                glacier_transition_status: 'pending',
                glacier_transition_error: null
              }
            }
          );

          // Transition files
          const result = await transitionDocumentToGlacier(doc);

          // Update document status
          if (result.success) {
            await recordsCollection.updateOne(
              { _id: doc._id },
              {
                $set: {
                  glacier_transitioned_at: new Date(),
                  glacier_transition_status: 'completed',
                  glacier_transition_error: null
                }
              }
            );
            totalSucceeded++;
            console.log(`  ✅ Document ${doc._id} transitioned successfully`);
          } else {
            const errorMsg = result.errors.length > 0 
              ? JSON.stringify(result.errors) 
              : 'Some files failed to transition';
            
            await recordsCollection.updateOne(
              { _id: doc._id },
              {
                $set: {
                  glacier_transition_status: 'failed',
                  glacier_transition_error: errorMsg
                }
              }
            );
            totalFailed++;
            failedDocuments.push({ _id: doc._id, error: errorMsg });
            console.log(`  ❌ Document ${doc._id} transition failed`);
          }

          totalProcessed++;
        } catch (error) {
          console.error(`  ❌ Error processing document ${doc._id}:`, error.message);
          
          await recordsCollection.updateOne(
            { _id: doc._id },
            {
              $set: {
                glacier_transition_status: 'failed',
                glacier_transition_error: error.message
              }
            }
          );
          
          totalFailed++;
          failedDocuments.push({ _id: doc._id, error: error.message });
        }
      }

      // Small delay between batches to avoid overwhelming S3
      if (i + BATCH_SIZE < oldDocuments.length) {
        console.log('  ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GLACIER TRANSITION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully transitioned: ${totalSucceeded} document(s)`);
    console.log(`❌ Failed: ${totalFailed} document(s)`);
    console.log(`📋 Total processed: ${totalProcessed} document(s)`);
    
    if (failedDocuments.length > 0) {
      console.log('\n❌ FAILED DOCUMENTS:');
      failedDocuments.forEach((doc, index) => {
        console.log(`  ${index + 1}. Document ${doc._id}: ${doc.error}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: totalFailed === 0,
      totalDocuments: totalDocuments,
      processed: totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      failedDocuments: failedDocuments
    };
  } catch (error) {
    console.error('💥 Glacier transition check failed:', error);
    throw error;
  }
}

/**
 * Check and restore active documents from Glacier to Standard
 * Called when document_status changes from 'old' to 'active'
 * @returns {Promise<Object>} Summary of processing
 */
export async function restoreActiveDocuments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 GLACIER RESTORATION CHECK STARTED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Find documents that are active but were previously in Glacier
    const query = {
      document_status: 'active',
      glacier_transitioned_at: { $exists: true, $ne: null },
      glacier_restored_at: { $exists: false }
    };

    const activeDocuments = await recordsCollection.find(query).toArray();
    const totalDocuments = activeDocuments.length;

    console.log(`📋 Found ${totalDocuments} document(s) that need restoration from Glacier`);

    if (totalDocuments === 0) {
      console.log('✅ No documents need restoration. All up to date!');
      return {
        success: true,
        totalDocuments: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
      };
    }

    // Process in batches
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const failedDocuments = [];

    for (let i = 0; i < activeDocuments.length; i += BATCH_SIZE) {
      const batch = activeDocuments.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(activeDocuments.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} document(s))`);

      for (const doc of batch) {
        try {
          // Restore files
          const result = await restoreDocumentToStandard(doc);

          // Update document status
          if (result.success) {
            await recordsCollection.updateOne(
              { _id: doc._id },
              {
                $set: {
                  glacier_restored_at: new Date()
                }
              }
            );
            totalSucceeded++;
            console.log(`  ✅ Document ${doc._id} restored successfully`);
          } else {
            const errorMsg = result.errors.length > 0 
              ? JSON.stringify(result.errors) 
              : 'Some files failed to restore';
            
            totalFailed++;
            failedDocuments.push({ _id: doc._id, error: errorMsg });
            console.log(`  ❌ Document ${doc._id} restoration failed`);
          }

          totalProcessed++;
        } catch (error) {
          console.error(`  ❌ Error processing document ${doc._id}:`, error.message);
          totalFailed++;
          failedDocuments.push({ _id: doc._id, error: error.message });
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < activeDocuments.length) {
        console.log('  ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GLACIER RESTORATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully restored: ${totalSucceeded} document(s)`);
    console.log(`❌ Failed: ${totalFailed} document(s)`);
    console.log(`📋 Total processed: ${totalProcessed} document(s)`);
    
    if (failedDocuments.length > 0) {
      console.log('\n❌ FAILED DOCUMENTS:');
      failedDocuments.forEach((doc, index) => {
        console.log(`  ${index + 1}. Document ${doc._id}: ${doc.error}`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: totalFailed === 0,
      totalDocuments: totalDocuments,
      processed: totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      failedDocuments: failedDocuments
    };
  } catch (error) {
    console.error('💥 Glacier restoration check failed:', error);
    throw error;
  }
}

/**
 * Immediately transition a document to Glacier if it has document_status 'old'
 * This is called when a document is archived and found to be old
 * @param {Object} doc - MongoDB document from records collection
 * @returns {Promise<{success: boolean, filesProcessed: number, filesSucceeded: number}>}
 */
export async function transitionOldDocumentImmediately(doc) {
  if (!doc || doc.document_status !== 'old') {
    return { success: true, filesProcessed: 0, filesSucceeded: 0, skipped: true };
  }

  console.log(`\n🧊 Immediate Glacier transition for old document: ${doc._id}`);
  
  try {
    // Transition files
    const result = await transitionDocumentToGlacier(doc);

    // Update document status in MongoDB
    if (result.success) {
      await recordsCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            glacier_transitioned_at: new Date(),
            glacier_transition_status: 'completed',
            glacier_transition_error: null
          }
        }
      );
      console.log(`✅ Document ${doc._id} immediately transitioned to Glacier`);
    } else {
      const errorMsg = result.errors.length > 0 
        ? JSON.stringify(result.errors) 
        : 'Some files failed to transition';
      
      await recordsCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            glacier_transition_status: 'failed',
            glacier_transition_error: errorMsg
          }
        }
      );
      console.error(`❌ Document ${doc._id} immediate transition failed: ${errorMsg}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Error in immediate Glacier transition for ${doc._id}:`, error.message);
    
    // Update document with error
    await recordsCollection.updateOne(
      { _id: doc._id },
      {
        $set: {
          glacier_transition_status: 'failed',
          glacier_transition_error: error.message
        }
      }
    );

    return {
      success: false,
      filesProcessed: 0,
      filesSucceeded: 0,
      errors: [{ error: error.message }]
    };
  }
}

// Export helper functions for testing if needed
export {
  extractAllFileKeys,
  detectBucketFromKey,
  transitionFileToGlacier,
  transitionFileToStandard,
  transitionDocumentToGlacier,
  restoreDocumentToStandard
};

