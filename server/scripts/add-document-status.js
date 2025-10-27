// add-document-status.js
// Script to add document_status field to all records based on year

import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { unlinkSync } from 'fs';

// Load environment variables
dotenv.config({ path: '../config.env' });

async function addDocumentStatus() {
  try {
    console.log('🚀 Starting document status migration...');
    
    const db = getDb();
    if (!db) {
      throw new Error('MongoDB database not available');
    }
    
    const recordsCollection = db.collection('records');
    
    // Get all documents
    const documents = await recordsCollection.find({}).toArray();
    
    console.log(`📋 Found ${documents.length} documents to process`);
    
    if (documents.length === 0) {
      console.log('ℹ️ No documents found. Nothing to migrate.');
      return;
    }
    
    const currentYear = new Date().getFullYear();
    console.log(`📅 Current year: ${currentYear}`);
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process documents
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docId = doc._id;
      
      try {
        let year = doc.year;
        let statusToSet = null;
        
        // Check if document has a year key
        if (year === undefined || year === null) {
          // No year key, set it to 2025
          year = 2025;
          console.log(`  📝 [${i + 1}/${documents.length}] Document ${docId} has no year, setting to 2025`);
        }
        
        // Check if document is 5 years old or older
        const age = currentYear - year;
        
        if (age >= 5) {
          statusToSet = 'old';
        } else {
          statusToSet = 'active';
        }
        
        // Update the document with both year (if it was missing) and document_status
        const updateFields = { document_status: statusToSet };
        if (doc.year === undefined || doc.year === null) {
          updateFields.year = year;
        }
        
        await recordsCollection.updateOne(
          { _id: docId },
          { $set: updateFields }
        );
        
        console.log(`  ✅ [${i + 1}/${documents.length}] Document ${docId}: year=${year}, age=${age}, status=${statusToSet}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error processing document ${docId}:`, error.message);
        errorCount++;
        errors.push({ docId: docId.toString(), error: error.message });
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    console.log(`📋 Total documents: ${documents.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS DETAILS:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.docId}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Migration completed!');
    
    // Delete this script after execution
    console.log('\n🗑️  Deleting migration script...');
    const __filename = fileURLToPath(import.meta.url);
    const scriptPath = __filename;
    unlinkSync(scriptPath);
    console.log('✅ Script deleted successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addDocumentStatus()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

