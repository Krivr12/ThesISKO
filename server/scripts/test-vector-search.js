// test-vector-search.js
// Test basic vector search without score filtering

import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import { generateEmbedding } from '../controller/embeddingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../config.env' });

async function testVectorSearch() {
  try {
    console.log('🔍 Testing basic vector search...');
    
    const db = getDb();
    const collection = db.collection('records');
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding("wellness tracking");
    console.log('✅ Query embedding generated');
    
    // Test basic vector search without score filtering
    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: "AbstractSemanticSearch",
          path: "abstract_embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 10,
          similarity: "dotProduct",
        },
      },
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          score: 1,
        },
      },
    ]).toArray();
    
    console.log(`✅ Vector search returned ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} (Score: ${result.score})`);
    });
    
  } catch (error) {
    console.error('❌ Vector search test failed:', error);
  }
}

// Run the test
testVectorSearch()
  .then(() => {
    console.log('✅ Vector search test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Vector search test failed:', error);
    process.exit(1);
  });
