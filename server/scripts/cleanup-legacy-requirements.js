import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const cleanupLegacyRequirements = async () => {
  try {
    console.log('🧹 Starting cleanup of legacy requirements data...');

    await connectToDatabase();
    const db = getDb();
    const collection = db.collection('requirements');

    // Get all active requirements
    const requirements = await collection.find({ is_active: true }).toArray();
    
    console.log(`Found ${requirements.length} active requirements to check`);

    for (const requirement of requirements) {
      console.log(`\n📋 Processing: ${requirement.document_type}`);
      
      const updates = {};
      let hasChanges = false;

      // Fields that should be in structured_fields, not metadata
      const structuredFields = ['authors', 'tags', 'panelists', 'abstract'];
      
      // Check if any structured fields are incorrectly in required_metadata
      const incorrectMetadata = requirement.required_metadata?.filter(field => 
        structuredFields.includes(field)
      ) || [];

      if (incorrectMetadata.length > 0) {
        console.log(`  ❌ Found legacy fields in metadata: ${incorrectMetadata.join(', ')}`);
        
        // Remove these fields from required_metadata
        const cleanedMetadata = requirement.required_metadata.filter(field => 
          !structuredFields.includes(field)
        );
        
        updates.required_metadata = cleanedMetadata;
        hasChanges = true;
        
        console.log(`  ✅ Cleaned metadata: ${cleanedMetadata.join(', ')}`);
      }

      // Ensure structured fields are properly configured
      if (!requirement.required_structured_fields) {
        updates.required_structured_fields = {};
        hasChanges = true;
      }

      // Add missing structured fields if they were in metadata
      const structuredConfig = updates.required_structured_fields || requirement.required_structured_fields || {};
      
      if (incorrectMetadata.includes('authors') && !structuredConfig.authors) {
        structuredConfig.authors = {
          enabled: true,
          min_count: 1,
          max_count: 5,
          require_firstname_lastname: true
        };
        hasChanges = true;
        console.log(`  ✅ Added authors to structured fields`);
      }

      if (incorrectMetadata.includes('tags') && !structuredConfig.tags) {
        structuredConfig.tags = {
          enabled: true,
          min_count: 1,
          max_count: 10,
          require_firstname_lastname: false
        };
        hasChanges = true;
        console.log(`  ✅ Added tags to structured fields`);
      }

      if (incorrectMetadata.includes('panelists') && !structuredConfig.panelists) {
        structuredConfig.panelists = {
          enabled: true,
          min_count: 1,
          max_count: 4,
          require_firstname_lastname: true
        };
        hasChanges = true;
        console.log(`  ✅ Added panelists to structured fields`);
      }

      if (incorrectMetadata.includes('abstract') && !structuredConfig.abstract) {
        structuredConfig.abstract = {
          enabled: true,
          min_count: 1,
          max_count: 1,
          require_firstname_lastname: false
        };
        hasChanges = true;
        console.log(`  ✅ Added abstract to structured fields`);
      }

      if (Object.keys(structuredConfig).length > 0) {
        updates.required_structured_fields = structuredConfig;
      }

      // Update the document if there are changes
      if (hasChanges) {
        updates.updated_at = new Date();
        
        const result = await collection.updateOne(
          { _id: requirement._id },
          { $set: updates }
        );

        if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated ${requirement.document_type} successfully`);
        } else {
          console.log(`  ⚠️ No changes made to ${requirement.document_type}`);
        }
      } else {
        console.log(`  ✅ ${requirement.document_type} is already clean`);
      }
    }

    console.log('\n🎉 Legacy cleanup completed!');
    console.log('\n📊 Summary:');
    console.log('- Removed legacy fields from required_metadata');
    console.log('- Added proper structured field configurations');
    console.log('- Updated timestamps');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// Run the cleanup
cleanupLegacyRequirements();
