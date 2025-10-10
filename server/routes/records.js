import express from "express";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";
import { generateEmbedding, semanticSearch  } from "../controller/embeddingService.js";
import { ObjectId } from "mongodb";

const router = express.Router();
const VECTOR_INDEX = "AbstractSemanticSearch"; // replace with your Atlas vector index
const collection = RepoMongodb ? RepoMongodb.collection("records") : null;

// Helper function to check MongoDB availability
const checkMongoDB = (res) => {
  if (!collection) {
    res.status(503).json({ error: "MongoDB not available" });
    return false;
  }
  return true;
};

// -------------------- Routes --------------------

// GET all records (minimal data for search page)
router.get("/", async (req, res) => {
  if (!checkMongoDB(res)) return;
  try {
    const results = await collection.find({}).toArray();
    
    // Transform to minimal data for search page
    const transformedResults = results.map(doc => {
      // Handle empty authors array
      const firstAuthor = doc.authors && doc.authors.length > 0 
        ? doc.authors[0] 
        : "Unknown Author";
      
      // Extract year from submitted_at, handle null/undefined
      let year = null;
      if (doc.submitted_at) {
        try {
          year = new Date(doc.submitted_at).getFullYear();
        } catch (dateError) {
          console.warn(`Invalid date for document ${doc._id}:`, doc.submitted_at);
          year = new Date().getFullYear(); // Fallback to current year
        }
      } else {
        year = new Date().getFullYear(); // Fallback to current year
      }
      
      return {
        _id: doc._id || doc.id, // Handle both _id and id fields
        document_id: doc.document_id || doc.doc_id || (doc._id || doc.id)?.toString(), // Handle doc_id field
        title: doc.title || "Untitled",
        submitted_at: doc.submitted_at, // Keep original field name for frontend
        authors: doc.authors || [], // Keep original field name for frontend
        tags: doc.tags || [] // Keep original field name for frontend
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
    const results = await collection
      .find({})
      .sort({ submitted_at: -1 })
      .limit(6)
      .toArray();
    
    // Transform to same format as /records/ endpoint
    const transformedResults = results.map(doc => {
      return {
        _id: doc._id || doc.id, // Handle both _id and id fields
        document_id: doc.document_id || doc.doc_id || (doc._id || doc.id)?.toString(), // Handle doc_id field
        title: doc.title || "Untitled",
        submitted_at: doc.submitted_at, // Keep original field name for frontend
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

// POST new record (FOR TESTING ONLY NOT UPDATED ANYMORE)
router.post("/", async (req, res) => {
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

// POST bulk insert (FOR TESTING ONLY NOT UPDATED ANYMORE)
router.post("/bulk", async (req, res) => {
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
    const { query, topK = 5 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query (string) is required" });
    }

    const results = await semanticSearch(query, topK);
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

// DELETE a record by doc_id
router.delete("/:doc_id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ doc_id: req.params.doc_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.status(200).json({
      message: `Record ${req.params.doc_id} deleted successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting record" });
  }
});

// PUT update record by doc_id
router.put("/:doc_id", async (req, res) => {
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