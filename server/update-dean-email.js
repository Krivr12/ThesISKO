import { getDb } from './databaseConnections/MongoDB/mongodb_connection.js';

async function updateDeanEmail() {
  try {
    const db = getDb();
    const programsCollection = db.collection('programs');

    // Update the BSIT program to add dean_email
    const result = await programsCollection.updateOne(
      { program_id: 'BSIT' },
      { 
        $set: { 
          dean_email: 'thesiskopup@gmail.com' 
        } 
      }
    );

    console.log('✅ Updated programs collection:');
    console.log(`- Matched: ${result.matchedCount} documents`);
    console.log(`- Modified: ${result.modifiedCount} documents`);

    // Verify the update
    const updatedProgram = await programsCollection.findOne({ program_id: 'BSIT' });
    console.log('📋 Updated program:', updatedProgram);

  } catch (error) {
    console.error('❌ Error updating dean email:', error);
  }
}

updateDeanEmail();
