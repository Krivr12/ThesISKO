// debug-api-connectivity.js
// Script to debug API connectivity and CORS issues

import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import { semanticSearch } from '../controller/embeddingService.js';
import dotenv from 'dotenv';
// Using built-in fetch (Node.js 18+)

// Load environment variables
dotenv.config({ path: '../config.env' });

async function debugApiConnectivity() {
  try {
    console.log('🔍 Debugging API connectivity and CORS...');
    
    const db = getDb();
    const recordsCollection = db.collection('records');
    
    // 1. Test direct semantic search (backend)
    console.log('\n📋 Testing direct semantic search (backend)...');
    try {
      const results = await semanticSearch("wellness tracking", 5);
      console.log(`✅ Backend semantic search works: ${results.length} results`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title}`);
      });
    } catch (error) {
      console.error('❌ Backend semantic search failed:', error.message);
    }
    
    // 2. Test API endpoint directly
    console.log('\n🌐 Testing API endpoint directly...');
    const apiUrl = 'http://localhost:5050/records/search';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: "wellness tracking",
          topK: 5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API endpoint works: ${data.results?.length || 0} results`);
        if (data.results) {
          data.results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.title}`);
          });
        }
      } else {
        console.error(`❌ API endpoint failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (fetchError) {
      console.error('❌ API endpoint connection failed:', fetchError.message);
      console.error('This might be a CORS issue or server not running');
    }
    
    // 3. Test CORS headers
    console.log('\n🔒 Testing CORS headers...');
    try {
      const corsResponse = await fetch('http://localhost:5050/records/', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:4200',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      console.log(`CORS preflight response: ${corsResponse.status}`);
      console.log('CORS headers:', {
        'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers')
      });
    } catch (corsError) {
      console.error('❌ CORS test failed:', corsError.message);
    }
    
    // 4. Test basic records endpoint
    console.log('\n📊 Testing basic records endpoint...');
    try {
      const recordsResponse = await fetch('http://localhost:5050/records/');
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log(`✅ Records endpoint works: ${recordsData.length} total records`);
      } else {
        console.error(`❌ Records endpoint failed: ${recordsResponse.status}`);
      }
    } catch (recordsError) {
      console.error('❌ Records endpoint connection failed:', recordsError.message);
    }
    
    // 5. Check server status
    console.log('\n🖥️ Checking server status...');
    try {
      const healthResponse = await fetch('http://localhost:5050/');
      console.log(`Server status: ${healthResponse.status}`);
    } catch (healthError) {
      console.error('❌ Server not responding:', healthError.message);
      console.error('Make sure your server is running on port 5050');
    }
    
    // 6. Environment check
    console.log('\n⚙️ Environment check...');
    console.log('API URL from environment:', process.env.API_URL || 'Not set');
    console.log('Records API URL:', process.env.RECORDS_API_URL || 'Not set');
    console.log('Frontend URL:', process.env.FRONTEND_URL || 'Not set');
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

// Run the debug
debugApiConnectivity()
  .then(() => {
    console.log('✅ API connectivity debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });
