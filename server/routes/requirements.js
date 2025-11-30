import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const router = express.Router();

// Helper to get collection
const getRequirementsCollection = () => {
  const db = getDb();
  return db.collection('requirements');
};

// GET all requirements
router.get('/', async (req, res) => {
  try {
    const collection = getRequirementsCollection();
    const requirements = await collection
      .find({ is_active: true })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ success: true, data: requirements });
  } catch (error) {
    console.error('❌ Error fetching requirements:', error);
    res.status(500).json({ error: 'Error fetching requirements' });
  }
});

// GET unique document types (for dropdowns and filters)
// NOTE: This route must be placed BEFORE parameterized routes like /:document_type/files
router.get('/document-types', async (req, res) => {
  try {
    console.log('📋 Fetching unique document types from requirements collection');
    const collection = getRequirementsCollection();
    const requirements = await collection
      .find({ is_active: true })
      .project({ document_type: 1, _id: 0 })
      .toArray();

    console.log(`📊 Found ${requirements.length} active requirements`);

    // Extract unique document types
    const uniqueTypes = [...new Set(requirements.map(r => r.document_type))].sort();

    console.log(`✅ Returning ${uniqueTypes.length} unique document types:`, uniqueTypes);

    res.json({ success: true, data: uniqueTypes });
  } catch (error) {
    console.error('❌ Error fetching document types:', error);
    res.status(500).json({ error: 'Error fetching document types' });
  }
});

// GET requirements by document type
router.get('/by-type/:document_type', async (req, res) => {
  try {
    const { document_type } = req.params;
    const collection = getRequirementsCollection();
    
    const requirement = await collection.findOne({ 
      document_type,
      is_active: true 
    });

    if (!requirement) {
      return res.status(404).json({ 
        success: false, 
        error: 'No requirements found for this document type' 
      });
    }

    res.json({ success: true, data: requirement });
  } catch (error) {
    console.error('❌ Error fetching requirement by type:', error);
    res.status(500).json({ error: 'Error fetching requirement' });
  }
});

// GET required files for a document type (simplified endpoint for frontend)
router.get('/:document_type/files', async (req, res) => {
  try {
    const { document_type } = req.params;
    const collection = getRequirementsCollection();
    
    const requirement = await collection.findOne({ 
      document_type,
      is_active: true 
    });

    if (!requirement) {
      return res.status(404).json({ 
        success: false, 
        error: 'No requirements found for this document type' 
      });
    }

    // Return only the required files for frontend
    res.json({ 
      success: true, 
      data: {
        document_type: requirement.document_type,
        required_files: requirement.required_files || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching required files:', error);
    res.status(500).json({ error: 'Error fetching required files' });
  }
});

// POST create new requirement
// Example required_files structure:
// [
//   { id: 'manuscript', label: 'Manuscript', required: true, accept: '.pdf', to_be_archived: true },
//   { id: 'turnitin', label: 'Turnitin Checker Output', required: true, accept: '.pdf', to_be_archived: false },
//   { id: 'copyright', label: 'Copyright Form', required: true, accept: '.pdf', to_be_archived: false }
// ]
// Note: to_be_archived=true files will be moved to repository when dean approves
router.post('/', async (req, res) => {
  try {
    const {
      document_type,
      required_metadata,
      required_structured_fields,
      required_files,
      created_by
    } = req.body;

    // Validation
    if (!document_type || !required_metadata || !required_files) {
      return res.status(400).json({ 
        error: 'Missing required fields: document_type, required_metadata, required_files' 
      });
    }

    const collection = getRequirementsCollection();

    // Check if requirement already exists for this document type
    const existing = await collection.findOne({ 
      document_type,
      is_active: true 
    });

    if (existing) {
      return res.status(400).json({ 
        error: 'Requirements already exist for this document type' 
      });
    }

    const newRequirement = {
      _id: new ObjectId(),
      document_type,
      required_metadata: Array.isArray(required_metadata) ? required_metadata : [],
      required_structured_fields: required_structured_fields || {},
      required_files: Array.isArray(required_files) ? required_files : [],
      created_by: created_by || 'system',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    await collection.insertOne(newRequirement);

    console.log(`✅ Requirement created for document type: ${document_type}`);

    res.json({ 
      success: true, 
      message: 'Requirement created successfully',
      data: newRequirement
    });
  } catch (error) {
    console.error('❌ Error creating requirement:', error);
    res.status(500).json({ error: 'Error creating requirement' });
  }
});

// PATCH update requirement
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.created_at;
    delete updateData.created_by;

    updateData.updated_at = new Date();

    const collection = getRequirementsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    console.log(`✅ Requirement updated: ${id}`);

    res.json({ 
      success: true, 
      message: 'Requirement updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating requirement:', error);
    res.status(500).json({ error: 'Error updating requirement' });
  }
});

// PUT update requirement (for frontend compatibility)
router.put('/:document_type', async (req, res) => {
  try {
    const { document_type } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.created_at;
    delete updateData.created_by;

    updateData.updated_at = new Date();

    const collection = getRequirementsCollection();
    const result = await collection.updateOne(
      { document_type: document_type, is_active: true },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    console.log(`✅ Requirement updated: ${document_type}`);

    res.json({ 
      success: true, 
      message: 'Requirement updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating requirement:', error);
    res.status(500).json({ error: 'Error updating requirement' });
  }
});

// DELETE requirement by document_type (soft delete)
router.delete('/:document_type', async (req, res) => {
  try {
    const { document_type } = req.params;

    const collection = getRequirementsCollection();
    const result = await collection.updateOne(
      { document_type: document_type, is_active: true },
      { 
        $set: { 
          is_active: false,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    console.log(`✅ Requirement deactivated: ${document_type}`);

    res.json({ 
      success: true, 
      message: 'Requirement deactivated successfully'
    });
  } catch (error) {
    console.error('❌ Error deactivating requirement:', error);
    res.status(500).json({ error: 'Error deactivating requirement' });
  }
});

// DELETE requirement by ID (soft delete) - alternative endpoint
router.delete('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const collection = getRequirementsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          is_active: false,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    console.log(`✅ Requirement deactivated: ${id}`);

    res.json({ 
      success: true, 
      message: 'Requirement deactivated successfully'
    });
  } catch (error) {
    console.error('❌ Error deactivating requirement:', error);
    res.status(500).json({ error: 'Error deactivating requirement' });
  }
});

export default router;
