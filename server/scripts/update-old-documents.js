// update-old-documents.js
// Script to update document_status to "old" for documents that are 5+ years old

import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlinkSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load config.env from server directory
const configPath = join(__dirname, '../config.env');
dotenv.config({ path: configPath });

async function updateOldDocuments() {
  let client;
  try {
    console.log('🚀 Starting document status update for old documents...');
    
    const uri = process.env.ATLAS_URI || "";
    if (!uri || !uri.startsWith("mongodb")) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    // Create MongoDB connection
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB Atlas!");
    
    const db = client.db("thesisko");
    
    const recordsCollection = db.collection('records');
    
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 5;
    console.log(`📅 Current year: ${currentYear}`);
    console.log(`📅 Cutoff year (5 years ago): ${cutoffYear}`);
    console.log(`🔍 Looking for documents with year <= ${cutoffYear}`);
    
    // Find all documents where year is 5+ years old
    const query = {
      year: { $lte: cutoffYear }
    };
    
    const documents = await recordsCollection.find(query).toArray();
    
    console.log(`📋 Found ${documents.length} documents that are 5+ years old`);
    
    if (documents.length === 0) {
      console.log('ℹ️ No old documents found. Nothing to update.');
      // Still delete the script
      console.log('\n🗑️  Deleting script...');
      unlinkSync(__filename);
      console.log('✅ Script deleted successfully');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Update documents
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docId = doc._id;
      const docYear = doc.year;
      
      try {
        await recordsCollection.updateOne(
          { _id: docId },
          { $set: { document_status: 'old' } }
        );
        
        const age = currentYear - docYear;
        console.log(`  ✅ [${i + 1}/${documents.length}] Document ${docId}: year=${docYear}, age=${age}, status=old`);
        updatedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error updating document ${docId}:`, error.message);
        errorCount++;
        errors.push({ docId: docId.toString(), error: error.message });
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    console.log(`📋 Total old documents found: ${documents.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS DETAILS:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.docId}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Update completed!');
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
    
    // Delete this script after execution
    console.log('\n🗑️  Deleting script...');
    try {
      unlinkSync(__filename);
      console.log('✅ Script deleted successfully');
    } catch (deleteError) {
      console.error('⚠️  Could not delete script:', deleteError.message);
    }
  }
}

// Run the update
updateOldDocuments()
  .then(() => {
    console.log('✅ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

