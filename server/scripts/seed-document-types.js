import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const seedDocumentTypes = async () => {
  try {
    console.log('🌱 Starting document types seeding...');

    await connectToDatabase();
    const db = getDb();
    const collection = db.collection('document_types');

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log('⚠️ Document types already exist. Skipping seed.');
      process.exit(0);
    }

    // Default metadata fields for all document types
    const defaultMetadata = [
      'title',
      'abstract',
      'authors',
      'tags',
      'adviser',
      'faculty_in_charge',
      'panelists',
      'department',
      'program',
      'access_level'
    ];

    // Capstone Paper document type
    const capstoneType = {
      _id: new ObjectId(),
      type_id: 'capstone_paper',
      type_name: 'Capstone Paper',
      required_metadata: defaultMetadata,
      required_files: [
        {
          id: 'manuscript',
          label: 'Manuscript File',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'turnitin',
          label: 'Turnitin Checker Output',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'copyright',
          label: 'Copyright Form',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'ethics_clearance',
          label: 'Ethics Clearance',
          required: true,
          accept: '.pdf'
        }
      ],
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    // Thesis document type
    const thesisType = {
      _id: new ObjectId(),
      type_id: 'thesis',
      type_name: 'Thesis',
      required_metadata: defaultMetadata,
      required_files: [
        {
          id: 'manuscript',
          label: 'Manuscript File',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'turnitin',
          label: 'Turnitin Checker Output',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'copyright',
          label: 'Copyright Form',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'ethics_clearance',
          label: 'Ethics Clearance',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'survey_questionnaire',
          label: 'Survey Questionnaire',
          required: true,
          accept: '.pdf'
        }
      ],
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    // Insert both document types
    await collection.insertMany([capstoneType, thesisType]);

    console.log('✅ Successfully seeded document types:');
    console.log('   - Capstone Paper (4 file requirements)');
    console.log('   - Thesis (5 file requirements)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding document types:', error);
    process.exit(1);
  }
};

seedDocumentTypes();

