// re-embed-documents.js
// Migration script to re-embed all documents with the new L12-v2 model

import { generateEmbedding } from '../controller/embeddingService.js';
import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../config.env' });

async function reEmbedAllDocuments() {
  try {
    console.log('🚀 Starting document re-embedding migration...');
    console.log('📊 Using model: Xenova/all-MiniLM-L12-v2');
    
    const db = getDb();
    const recordsCollection = db.collection('records');
    
    // Get all documents that have abstract_embedding
    const documents = await recordsCollection.find({
      abstract_embedding: { $exists: true }
    }).toArray();
    
    console.log(`📋 Found ${documents.length} documents to re-embed`);
    
    if (documents.length === 0) {
      console.log('ℹ️ No documents found with abstract_embedding. Nothing to migrate.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process documents in batches to avoid overwhelming the system
    const batchSize = 10;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (doc, index) => {
        const globalIndex = i + index + 1;
        console.log(`  🔄 [${globalIndex}/${documents.length}] Processing: ${doc.document_id || doc._id}`);
        
        try {
          // Generate new embedding
          const textToEmbed = `${doc.title || ''} ${doc.abstract || ''}`.trim();
          
          if (textToEmbed.length === 0) {
            console.log(`    ⚠️ Skipping ${doc.document_id || doc._id} - no title or abstract`);
            return { success: true, skipped: true };
          }
          
          const newEmbedding = await generateEmbedding(textToEmbed);
          
          // Update the document
          await recordsCollection.updateOne(
            { _id: doc._id },
            { $set: { abstract_embedding: newEmbedding } }
          );
          
          console.log(`    ✅ Updated: ${doc.document_id || doc._id}`);
          return { success: true, skipped: false };
          
        } catch (error) {
          console.error(`    ❌ Error processing ${doc.document_id || doc._id}:`, error.message);
          return { success: false, error: error.message, docId: doc.document_id || doc._id };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Count results
      batchResults.forEach(result => {
        if (result.success) {
          if (result.skipped) {
            // Don't count skipped as success
          } else {
            successCount++;
          }
        } else {
          errorCount++;
          errors.push({ docId: result.docId, error: result.error });
        }
      });
      
      // Small delay between batches to be gentle on the system
      if (i + batchSize < documents.length) {
        console.log('    ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${successCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    console.log(`📋 Total documents: ${documents.length}`);
    console.log(`⏭️ Skipped (no content): ${documents.length - successCount - errorCount} documents`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS DETAILS:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.docId}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
reEmbedAllDocuments()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
