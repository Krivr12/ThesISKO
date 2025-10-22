// debug-search.js
// Script to debug semantic search issues

import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import { semanticSearch } from '../controller/embeddingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../config.env' });

async function debugSearch() {
  try {
    console.log('🔍 Debugging semantic search...');
    
    const db = getDb();
    const recordsCollection = db.collection('records');
    
    // 1. Check if the document exists
    console.log('\n📋 Checking for "Smart Healthcare Monitoring System" document...');
    const healthcareDoc = await recordsCollection.findOne({
      title: { $regex: /Smart Healthcare Monitoring System/i }
    });
    
    if (healthcareDoc) {
      console.log('✅ Found document:', {
        _id: healthcareDoc._id,
        title: healthcareDoc.title,
        has_abstract: !!healthcareDoc.abstract,
        has_embedding: !!healthcareDoc.abstract_embedding,
        embedding_length: healthcareDoc.abstract_embedding?.length || 0
      });
    } else {
      console.log('❌ Document not found');
    }
    
    // 2. Check total documents with embeddings
    console.log('\n📊 Checking embedding statistics...');
    const totalDocs = await recordsCollection.countDocuments({});
    const docsWithEmbeddings = await recordsCollection.countDocuments({
      abstract_embedding: { $exists: true }
    });
    
    console.log(`Total documents: ${totalDocs}`);
    console.log(`Documents with embeddings: ${docsWithEmbeddings}`);
    
    // 3. Test semantic search
    console.log('\n🔍 Testing semantic search for "wellness tracking"...');
    try {
      const results = await semanticSearch("wellness tracking", 5);
      console.log(`✅ Search returned ${results.length} results:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (Score: ${result.score})`);
      });
    } catch (searchError) {
      console.error('❌ Search failed:', searchError.message);
    }
    
    // 4. Test with a simpler query
    console.log('\n🔍 Testing with simpler query "healthcare"...');
    try {
      const results = await semanticSearch("healthcare", 5);
      console.log(`✅ Search returned ${results.length} results:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (Score: ${result.score})`);
      });
    } catch (searchError) {
      console.error('❌ Search failed:', searchError.message);
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

// Run the debug
debugSearch()
  .then(() => {
    console.log('✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });
