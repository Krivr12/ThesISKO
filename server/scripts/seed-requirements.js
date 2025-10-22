import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const seedRequirements = async () => {
  try {
    console.log('🌱 Starting requirements seeding...');

    await connectToDatabase();
    const db = getDb();
    const collection = db.collection('requirements');

    // Check if already seeded
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log('⚠️ Requirements already exist. Skipping seed.');
      process.exit(0);
    }

    // Capstone Paper requirements
    const capstoneRequirements = {
      _id: new ObjectId(),
      document_type: 'capstone_paper',
      required_metadata: [
        'title',
        'abstract', 
        'adviser',
        'faculty_in_charge',
        'department',
        'program',
        'access_level'
      ],
      required_structured_fields: {
        authors: {
          enabled: true,
          min_count: 1,
          max_count: 5,
          require_firstname_lastname: true
        },
        panelists: {
          enabled: true,
          min_count: 1,
          max_count: 4,
          require_firstname_lastname: true
        },
        tags: {
          enabled: true,
          min_count: 3,
          require_firstname_lastname: false
        }
      },
      required_files: [
        {
          id: 'manuscript_file',
          label: 'Manuscript File',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'turnitin_file',
          label: 'Turnitin Checker Output',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'copyright_form_file',
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
      archive_files: [
        {
          id: 'manuscript_file',
          label: 'Manuscript File',
          to_be_archived: true
        },
        {
          id: 'turnitin_file',
          label: 'Turnitin Checker Output',
          to_be_archived: false
        },
        {
          id: 'copyright_form_file',
          label: 'Copyright Form',
          to_be_archived: false
        },
        {
          id: 'ethics_clearance',
          label: 'Ethics Clearance',
          to_be_archived: false
        }
      ],
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    // Thesis requirements
    const thesisRequirements = {
      _id: new ObjectId(),
      document_type: 'thesis',
      required_metadata: [
        'title',
        'abstract',
        'adviser',
        'faculty_in_charge',
        'department',
        'program',
        'access_level'
      ],
      required_structured_fields: {
        authors: {
          enabled: true,
          min_count: 1,
          max_count: 5,
          require_firstname_lastname: true
        },
        panelists: {
          enabled: true,
          min_count: 1,
          max_count: 4,
          require_firstname_lastname: true
        },
        tags: {
          enabled: true,
          min_count: 3,
          require_firstname_lastname: false
        }
      },
      required_files: [
        {
          id: 'manuscript_file',
          label: 'Manuscript File',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'turnitin_file',
          label: 'Turnitin Checker Output',
          required: true,
          accept: '.pdf'
        },
        {
          id: 'copyright_form_file',
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
      archive_files: [
        {
          id: 'manuscript_file',
          label: 'Manuscript File',
          to_be_archived: true
        },
        {
          id: 'turnitin_file',
          label: 'Turnitin Checker Output',
          to_be_archived: false
        },
        {
          id: 'copyright_form_file',
          label: 'Copyright Form',
          to_be_archived: false
        },
        {
          id: 'ethics_clearance',
          label: 'Ethics Clearance',
          to_be_archived: false
        }
      ],
      created_by: 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    // Insert requirements
    await collection.insertMany([capstoneRequirements, thesisRequirements]);

    console.log('✅ Requirements seeded successfully!');
    console.log('📋 Capstone Paper requirements created');
    console.log('📋 Thesis requirements created');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding requirements:', error);
    process.exit(1);
  }
};

seedRequirements();
