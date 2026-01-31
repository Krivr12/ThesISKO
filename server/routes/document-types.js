import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authorizationMiddleware.js';

const router = express.Router();

// Helper to get collection
const getDocumentTypesCollection = () => {
  const db = getDb();
  return db.collection('document_types');
};

// GET all active document types
router.get('/', async (req, res) => {
  try {
    const collection = getDocumentTypesCollection();
    const documentTypes = await collection
      .find({ is_active: true })
      .sort({ created_at: -1 })
      .toArray();

    res.json({ success: true, data: documentTypes });
  } catch (error) {
    console.error('❌ Error fetching document types:', error);
    res.status(500).json({ error: 'Error fetching document types' });
  }
});

// GET single document type by ID
router.get('/:type_id', async (req, res) => {
  try {
    const { type_id } = req.params;
    const collection = getDocumentTypesCollection();
    
    const documentType = await collection.findOne({ type_id });
    
    if (!documentType) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    res.json({ success: true, data: documentType });
  } catch (error) {
    console.error('❌ Error fetching document type:', error);
    res.status(500).json({ error: 'Error fetching document type' });
  }
});

// POST create new document type (admin only: role 3, 4, 5)
router.post('/', requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { type_name, required_metadata, required_files, created_by } = req.body;

    // Validation
    if (!type_name || !required_files || !Array.isArray(required_files)) {
      return res.status(400).json({ 
        error: 'type_name and required_files array are required' 
      });
    }

    if (required_files.length === 0) {
      return res.status(400).json({ 
        error: 'At least one file requirement is needed' 
      });
    }

    // Generate type_id (slug from name)
    const type_id = type_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const collection = getDocumentTypesCollection();

    // Check for duplicate type_id
    const existing = await collection.findOne({ type_id });
    if (existing) {
      return res.status(400).json({ 
        error: 'A document type with this name already exists' 
      });
    }

    // Default required metadata fields
    const defaultMetadata = [
      'title', 'abstract', 'authors', 'tags', 'adviser', 
      'faculty_in_charge', 'panelists', 'department', 'program', 'access_level'
    ];

    const newDocumentType = {
      _id: new ObjectId(),
      type_id,
      type_name,
      required_metadata: required_metadata || defaultMetadata,
      required_files,
      created_by: created_by || 'admin',
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    await collection.insertOne(newDocumentType);

    console.log(`✅ Document type created: ${type_id}`);
    res.json({ 
      success: true, 
      message: 'Document type created successfully',
      data: newDocumentType 
    });
  } catch (error) {
    console.error('❌ Error creating document type:', error);
    res.status(500).json({ error: 'Error creating document type' });
  }
});

// PATCH update document type (admin only)
router.patch('/:type_id', requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { type_id } = req.params;
    const { type_name, required_files, is_active } = req.body;

    const collection = getDocumentTypesCollection();

    const updateData = {
      updated_at: new Date()
    };

    if (type_name) updateData.type_name = type_name;
    if (required_files && Array.isArray(required_files)) {
      if (required_files.length === 0) {
        return res.status(400).json({ 
          error: 'At least one file requirement is needed' 
        });
      }
      updateData.required_files = required_files;
    }
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const result = await collection.updateOne(
      { type_id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    console.log(`✅ Document type updated: ${type_id}`);
    res.json({ 
      success: true, 
      message: 'Document type updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating document type:', error);
    res.status(500).json({ error: 'Error updating document type' });
  }
});

// DELETE soft delete document type (admin only)
router.delete('/:type_id', requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { type_id } = req.params;
    const collection = getDocumentTypesCollection();

    const result = await collection.updateOne(
      { type_id },
      { 
        $set: { 
          is_active: false,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document type not found' });
    }

    console.log(`✅ Document type deactivated: ${type_id}`);
    res.json({ 
      success: true, 
      message: 'Document type deactivated successfully' 
    });
  } catch (error) {
    console.error('❌ Error deactivating document type:', error);
    res.status(500).json({ error: 'Error deactivating document type' });
  }
});

export default router;

