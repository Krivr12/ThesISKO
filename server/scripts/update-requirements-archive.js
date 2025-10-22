import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const updateRequirementsArchive = async () => {
  try {
    console.log('🔄 Updating requirements with archive_files configuration...');

    await connectToDatabase();
    const db = getDb();
    const collection = db.collection('requirements');

    // Update capstone_paper requirements
    const capstoneResult = await collection.updateOne(
      { document_type: 'capstone_paper', is_active: true },
      {
        $set: {
          archive_files: [
            {
              id: 'manuscript',
              label: 'Manuscript File',
              to_be_archived: true
            },
            {
              id: 'turnitin',
              label: 'Turnitin Checker Output',
              to_be_archived: false
            },
            {
              id: 'copyright',
              label: 'Copyright Form',
              to_be_archived: false
            },
            {
              id: 'ethics_clearance',
              label: 'Ethics Clearance',
              to_be_archived: false
            }
          ],
          updated_at: new Date()
        }
      }
    );

    console.log(`✅ Capstone paper requirements updated: ${capstoneResult.modifiedCount} documents`);

    // Update thesis requirements
    const thesisResult = await collection.updateOne(
      { document_type: 'thesis', is_active: true },
      {
        $set: {
          archive_files: [
            {
              id: 'manuscript',
              label: 'Manuscript File',
              to_be_archived: true
            },
            {
              id: 'turnitin',
              label: 'Turnitin Checker Output',
              to_be_archived: false
            },
            {
              id: 'copyright',
              label: 'Copyright Form',
              to_be_archived: false
            },
            {
              id: 'ethics_clearance',
              label: 'Ethics Clearance',
              to_be_archived: false
            }
          ],
          updated_at: new Date()
        }
      }
    );

    console.log(`✅ Thesis requirements updated: ${thesisResult.modifiedCount} documents`);

    // Verify the updates
    const updatedRequirements = await collection.find({ is_active: true }).toArray();
    console.log('📋 Updated requirements:');
    updatedRequirements.forEach(req => {
      console.log(`  - ${req.document_type}: ${req.archive_files?.length || 0} archive files configured`);
    });

    console.log('✅ Requirements update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating requirements:', error);
    process.exit(1);
  }
};

updateRequirementsArchive();
