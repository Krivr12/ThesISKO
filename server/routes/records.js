import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import { generateEmbedding, semanticSearch  } from "../controller/embeddingService.js";
import { ObjectId } from "mongodb";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { optionalAuth } from "../middlewares/authMiddleware.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();
const VECTOR_INDEX = "AbstractSemanticSearch"; // replace with your Atlas vector index
const collection = RepoMongodb ? RepoMongodb.collection("records") : null;

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to check MongoDB availability
const checkMongoDB = (res) => {
  if (!collection) {
    res.status(503).json({ error: "MongoDB not available" });
    return false;
  }
  return true;
};

// -------------------- Routes --------------------

// GET all records (full data for admin only [role 3,4,5]; minimal for home/search is public)
router.get("/", optionalAuth, async (req, res) => {
  if (!checkMongoDB(res)) return;
  try {
    // Build query to exclude deleted documents for non-admin users
    let query = {};
    
    // If not admin, exclude deleted documents
    if (!req.user || !([3, 4, 5].includes(req.user.role_id))) {
      query = { document_status: { $ne: 'deleted' } };
    }
    
    const results = await collection.find(query).toArray();
    
    const fullData = req.query.full === 'true';
    
    if (fullData) {
      // Full data restricted to admin roles (3 Faculty, 4 Chairperson, 5 Superadmin)
      if (!req.user || !([3, 4, 5].includes(req.user.role_id))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Full records access requires admin role' });
      }
      const fullResults = results.map(doc => {
        const { abstract_embedding, ...recordData } = doc;
        return recordData;
      });
      return res.status(200).json(fullResults);
    }
    
    // Transform to minimal data for search page
    const transformedResults = results.map(doc => {
      // Handle empty authors array
      const firstAuthor = doc.authors && doc.authors.length > 0 
        ? doc.authors[0] 
        : "Unknown Author";
      
      // Use year field directly, show "N/A" if not available
      const year = doc.year || "N/A";
      
      return {
        _id: doc._id || doc.id, // Handle both _id and id fields
        document_id: doc.document_id || doc.doc_id || (doc._id || doc.id)?.toString(), // Handle doc_id field
        title: doc.title || "Untitled",
        author: firstAuthor, // Single author string for display
        authors: doc.authors || [], // Full array for filtering by any author
        year: year, // Use year field directly
        keywords: doc.tags || [] // Transform tags to keywords for search-thesis
      };
    });
    
    res.status(200).json(transformedResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching records" });
  }
});

// GET latest 6 records
router.get("/latest", async (req, res) => {
  if (!checkMongoDB(res)) return;
  try {
    // Exclude deleted documents from latest records
    const results = await collection
      .find({ document_status: { $ne: 'deleted' } })
      .sort({ created_at: -1 })
      .limit(6)
      .toArray();
    
    // Transform to same format as /records/ endpoint
    const transformedResults = results.map(doc => {
      // Comprehensive year extraction - check all possible locations
      let year = null;
      
      // 1. Check direct year field
      if (doc.year !== null && doc.year !== undefined) {
        year = doc.year;
      }
      
      // 2. Check nested metadata.year (if metadata is an object)
      if (!year && doc.metadata) {
        if (typeof doc.metadata === 'object' && doc.metadata.year) {
          year = doc.metadata.year;
        } else if (typeof doc.metadata === 'string') {
          // If metadata is a JSON string, try to parse it
          try {
            const parsedMetadata = JSON.parse(doc.metadata);
            if (parsedMetadata && parsedMetadata.year) {
              year = parsedMetadata.year;
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      // 3. Check nested student.year (if student is an object)
      if (!year && doc.student) {
        if (typeof doc.student === 'object' && doc.student.year) {
          year = doc.student.year;
        } else if (typeof doc.student === 'string') {
          // If student is a JSON string, try to parse it
          try {
            const parsedStudent = JSON.parse(doc.student);
            if (parsedStudent && parsedStudent.year) {
              year = parsedStudent.year;
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }
      
      // 4. Check metadata.student.year (nested path)
      if (!year && doc.metadata && typeof doc.metadata === 'object' && doc.metadata.student) {
        if (typeof doc.metadata.student === 'object' && doc.metadata.student.year) {
          year = doc.metadata.student.year;
        }
      }
      
      // 5. Extract from submitted_at if still no year found
      if (!year && doc.submitted_at) {
        try {
          const date = doc.submitted_at instanceof Date 
            ? doc.submitted_at 
            : new Date(doc.submitted_at);
          
          if (!isNaN(date.getTime())) {
            year = date.getFullYear();
          }
        } catch (error) {
          console.warn('Error parsing submitted_at date:', doc.submitted_at, error);
        }
      }
      
      // 6. Validate and convert year to number
      if (year !== null && year !== undefined) {
        // Try to convert to number
        const numYear = Number(year);
        if (!isNaN(numYear) && numYear > 1900 && numYear <= new Date().getFullYear() + 1) {
          year = numYear;
        } else {
          year = null; // Invalid year, reset
        }
      }
      
      // 7. Fallback to current year if still no valid year
      if (!year) {
        year = new Date().getFullYear();
      }
      
      // Debug log for first document to help troubleshoot
      if (results.indexOf(doc) === 0) {
        console.log('📋 Document structure check (first item):', {
          hasYear: !!doc.year,
          yearValue: doc.year,
          hasMetadata: !!doc.metadata,
          metadataType: typeof doc.metadata,
          hasStudent: !!doc.student,
          studentType: typeof doc.student,
          hasSubmittedAt: !!doc.submitted_at,
          extractedYear: year
        });
      }
      
      return {
        _id: doc._id || doc.id, // Handle both _id and id fields
        document_id: doc.document_id || doc.doc_id || (doc._id || doc.id)?.toString(), // Handle doc_id field
        title: doc.title || "Untitled",
        submitted_at: doc.submitted_at, // Keep original field name for frontend
        year: year, // Add year field extracted from all possible locations (always a number)
        authors: doc.authors || [], // Keep original field name for frontend
        tags: doc.tags || [] // Keep original field name for frontend
      };
    });

    res.status(200).json(transformedResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching latest records" });
  }
});

// GET single record by _id (full data for detail page)
router.get("/:_id", async (req, res) => {
  try {
    const result = await collection.findOne({ _id: new ObjectId(req.params._id) });

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }
    
    // Exclude unnecessary fields for detail page
    const { abstract_embedding, updated_at, ...filteredResult } = result;
    
    res.status(200).json(filteredResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching record" });
  }
});

// POST new record (admin only)
router.post("/", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const countForYear = await collection.countDocuments({
      doc_id: { $regex: `^${year}-` },
    });

    const newDocId = `${year}-${String(countForYear + 1).padStart(4, "0")}`;

    // Generate embedding (title + abstract)
    const textToEmbed = `${req.body.title} ${req.body.abstract}`;
    const embedding = await generateEmbedding(textToEmbed);

    const newDocument = {
      doc_id: newDocId,
      title: req.body.title,
      abstract: req.body.abstract,
      submitted_at: new Date(),
      access_level: req.body.access_level,
      authors: Array.isArray(req.body.authors) ? req.body.authors : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      program: req.body.program,
      document_type: req.body.document_type,
      abstract_embedding: embedding,
    };

    const result = await collection.insertOne(newDocument);
    res.status(201).json({
      insertedId: result.insertedId,
      doc_id: newDocId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding record" });
  }
});

// POST bulk insert (admin only)
router.post("/bulk", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res
        .status(400)
        .json({ error: "Request body must be an array of records" });
    }

    const year = new Date().getFullYear();
    let countForYear = await collection.countDocuments({
      doc_id: { $regex: `^${year}-` },
    });

    const newDocuments = await Promise.all(
      req.body.map(async (doc, index) => {
      const newDocId = `${year}-${String(countForYear + index + 1).padStart(4, "0")}`;
      const textToEmbed = `${doc.title} ${doc.abstract}`;
      const embedding = await generateEmbedding(textToEmbed);

    return {
      doc_id: newDocId,
      title: doc.title,
      abstract: doc.abstract,
      submitted_at: new Date(),
      access_level: doc.access_level,
      authors: Array.isArray(doc.authors) ? doc.authors : [],
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      program: doc.program,            // ✅ fixed
      document_type: doc.document_type, // ✅ fixed
      abstract_embedding: embedding,
    };
  })
);


    const result = await collection.insertMany(newDocuments);

    res.status(201).json({
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding records" });
  }
});

// POST semantic search
router.post("/search", async (req, res) => {
  try {
    const { query, topK = 5, numCandidates = null } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query (string) is required" });
    }

    // Validate topK
    const validTopK = Math.max(1, Math.min(parseInt(topK) || 5, 100)); // Clamp between 1 and 100

    // Validate numCandidates if provided (optional parameter)
    let validNumCandidates = null;
    if (numCandidates !== null && numCandidates !== undefined) {
      validNumCandidates = Math.max(10, Math.min(parseInt(numCandidates) || null, 1000)); // Clamp between 10 and 1000
    }

    const results = await semanticSearch(query, validTopK, validNumCandidates);
    return res.json({ results });
  } catch (err) {
    console.error("❌ Semantic search error:", err);
    return res.status(500).json({ error: "Error performing semantic search" });
  }
});


// POST get single document
router.post("/theses/by-ids", async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs array is required" });
    }

    // Convert string IDs to ObjectIds
    const objectIds = ids.map(id => new ObjectId(id));
    
    const results = await collection.find({
      _id: { $in: objectIds }
    }).toArray();
    
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching theses by IDs" });
  }
});

// DELETE a record by _id (admin only)
router.delete("/:_id", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { _id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    // 1. Find the record first to get file_key for S3 deletion
    const record = await collection.findOne({ _id: new ObjectId(_id) });

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    // 2. Delete file from S3 if file_key exists
    if (record.file_key) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.THESISKO_REPOSITORY_BUCKET || process.env.THESISKO_DOCUMENTS_BUCKET,
          Key: record.file_key,
        });
        await s3.send(deleteCommand);
        console.log(`✅ S3 file deleted: ${record.file_key}`);
      } catch (s3Error) {
        // Log S3 error but continue with MongoDB deletion
        console.warn(`⚠️ S3 deletion failed for ${record.file_key}:`, s3Error.message);
      }
    }

    // 3. Delete record from MongoDB
    const result = await collection.deleteOne({ _id: new ObjectId(_id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.status(200).json({
      message: `Record deleted successfully`,
      deletedId: _id,
      document_id: record.document_id,
    });
  } catch (err) {
    console.error("❌ Error deleting record:", err);
    res.status(500).json({ error: "Error deleting record" });
  }
});

// PATCH soft delete a record by _id (admin only - SUPERADMIN role 5)
router.patch("/:_id/soft-delete", requireAuth, requireRole(5), async (req, res) => {
  try {
    const { _id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    // Find the record first
    const record = await collection.findOne({ _id: new ObjectId(_id) });

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Soft delete: mark document_status as "deleted"
    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          document_status: "deleted",
          updated_at: new Date(),
          deleted_at: new Date(),  // Track when it was soft deleted
          deleted_by: req.user?.user_id || "system"  // Track who deleted it
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    console.log(`✅ Document soft deleted (marked as deleted): ${record.document_id}`);

    res.status(200).json({
      message: "Document soft deleted successfully (marked as deleted)",
      deletedId: _id,
      document_id: record.document_id,
      document_status: "deleted"
    });
  } catch (err) {
    console.error("❌ Error soft deleting record:", err);
    res.status(500).json({ error: "Error soft deleting record" });
  }
});

// PUT update record by _id (without file)
router.put("/:_id", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { _id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    // Find existing record
    const existingDoc = await collection.findOne({ _id: new ObjectId(_id) });
    if (!existingDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Build update object
    const updateFields = {};
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.abstract) updateFields.abstract = req.body.abstract;
    if (req.body.authors) {
      updateFields.authors = Array.isArray(req.body.authors) 
        ? req.body.authors 
        : JSON.parse(req.body.authors);
    }
    if (req.body.tags) updateFields.tags = req.body.tags;
    if (req.body.access_level) updateFields.access_level = req.body.access_level;
    
    updateFields.updated_at = new Date();

    // Regenerate embedding if title/abstract changes
    if (req.body.title || req.body.abstract) {
      const textToEmbed = `${req.body.title || existingDoc.title} ${
        req.body.abstract || existingDoc.abstract
      }`;
      updateFields.abstract_embedding = await generateEmbedding(textToEmbed);
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    res.json({
      message: "Record updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("❌ Error updating record:", err);
    res.status(500).json({ error: "Error updating record" });
  }
});

// PUT update record by _id (with file upload)
router.put("/:_id/with-file", requireAuth, requireRole(3, 4, 5), upload.single("manuscript"), async (req, res) => {
  try {
    const { _id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(_id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    // Find existing record
    const existingDoc = await collection.findOne({ _id: new ObjectId(_id) });
    if (!existingDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    console.log("📄 Updating record with file:", {
      _id,
      document_id: existingDoc.document_id,
      hasExistingFile: !!existingDoc.file_key,
      existingFileKey: existingDoc.file_key
    });

    // Build update object
    const updateFields = {};
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.abstract) updateFields.abstract = req.body.abstract;
    if (req.body.authors) {
      updateFields.authors = Array.isArray(req.body.authors) 
        ? req.body.authors 
        : JSON.parse(req.body.authors);
    }
    if (req.body.tags) updateFields.tags = req.body.tags;
    if (req.body.access_level) updateFields.access_level = req.body.access_level;
    
    updateFields.updated_at = new Date();

    // Handle file upload if provided
    if (req.file) {
      const bucket = process.env.THESISKO_REPOSITORY_BUCKET || process.env.THESISKO_DOCUMENTS_BUCKET;
      
      // Delete old file if exists
      if (existingDoc.file_key) {
        try {
          console.log(`🗑️ Deleting old file: ${existingDoc.file_key}`);
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucket,
            Key: existingDoc.file_key,
          });
          await s3.send(deleteCommand);
          console.log(`✅ Old file deleted successfully`);
        } catch (deleteError) {
          console.warn(`⚠️ Failed to delete old file:`, deleteError.message);
          // Continue with upload even if delete fails
        }
      }

      // Determine file path
      // For documents without group_id, use document_id
      let fileKey;
      if (existingDoc.group_id) {
        // Use group_id if available
        fileKey = `repository-files/${existingDoc.group_id}/${req.file.originalname}`;
      } else if (existingDoc.document_id) {
        // Fall back to document_id for older documents
        fileKey = `repository-files/${existingDoc.document_id}/${req.file.originalname}`;
      } else {
        // Last resort: use _id
        fileKey = `repository-files/${_id}/${req.file.originalname}`;
      }

      console.log(`📤 Uploading new file to: ${fileKey}`);

      // Upload new file
      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });

      await s3.send(putCommand);
      console.log(`✅ New file uploaded successfully`);

      // Update file_key in database
      updateFields.file_key = fileKey;
    }

    // Regenerate embedding if title/abstract changes
    if (req.body.title || req.body.abstract) {
      const textToEmbed = `${req.body.title || existingDoc.title} ${
        req.body.abstract || existingDoc.abstract
      }`;
      updateFields.abstract_embedding = await generateEmbedding(textToEmbed);
    }

    // Update record
    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateFields }
    );

    console.log(`✅ Record updated successfully`);

    res.json({
      message: "Record updated successfully with file",
      modifiedCount: result.modifiedCount,
      file_key: updateFields.file_key,
    });
  } catch (err) {
    console.error("❌ Error updating record with file:", err);
    res.status(500).json({ error: "Error updating record with file" });
  }
});

// PUT update record by doc_id (DEPRECATED - keeping for backwards compatibility)
router.put("/:doc_id", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { doc_id } = req.params;

    // Find existing record (needed for embedding regeneration)
    const existingDoc = await collection.findOne({ doc_id });
    if (!existingDoc) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Build update object
    const updateFields = {};
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.abstract) updateFields.abstract = req.body.abstract;
    if (req.body.access_level) updateFields.access_level = req.body.access_level;
    if (req.body.authors) updateFields.authors = req.body.authors;
    if (req.body.tags) updateFields.tags = req.body.tags;

    // Regenerate embedding if title/abstract changes
    if (req.body.title || req.body.abstract) {
      const textToEmbed = `${req.body.title || existingDoc.title} ${
        req.body.abstract || existingDoc.abstract
      }`;
      updateFields.abstract_embedding = await generateEmbedding(textToEmbed);
    }

    const result = await collection.updateOne(
      { doc_id },
      { $set: updateFields }
    );

    res.json({
      message: "Record updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating record" });
  }
});

export default router;


//node --env-file=config.env server.js