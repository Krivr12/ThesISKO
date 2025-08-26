import express from "express";
import RepoMongodb from "../RepoMongodb/connection.js";
import { ObjectId } from "mongodb";
import { generateAbstractEmbedding } from "../controller/abstractEmbedding.js";
import { generateEmbedding } from "../controller/searchEmbeddings.js";

const router = express.Router();

const VECTOR_INDEX = "AbstractSemanticSearch"; // replace with your vector index name
const collection = RepoMongodb.collection("records");

async function semanticSearch(query, limit = 5) {
  const embedding = await generateEmbedding(query);
  console.log("Embedding length:", embedding.length); // Should be 384 (or 768, etc.)

  const results = await collection
    .aggregate([
      {
        $vectorSearch: {
          queryVector: embedding,
          path: "abstract_embedding", // must match your stored field
          numCandidates: 100,
          limit: limit,
          index: VECTOR_INDEX,
        },
      },
    ])
    .toArray();

    return results.map((r) => ({
    title: r.title,
    authors: r.authors,
    submitted_at: r.submitted_at,
    tags: r.tags,
  }));
}



// GET all records
router.get("/", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");
    const results = await collection.find({}).toArray();
    res.status(200).send(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching records");
  }
});

// GET latest 6 records (exclude embedding for efficiency)
router.get("/latest", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");

    const results = await collection
      .find({}, { 
        projection: { 
          title: 1,
          submitted_at: 1,
          authors: 1,
          access_level: 1,
          tags: 1,
          _id: 0 // exclude _id if you don't need it, or set to 1 if you do
        } 
      })
      .sort({ submitted_at: -1 }) // newest first
      .limit(6)
      .toArray();

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching latest records");
  }
});

// GET single record by Document_Id
router.get("/:id", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");
    const query = { _id: req.params.id }; // 👈 use _id not Document_Id
    const result = await collection.findOne(query);

    if (!result) {
      res.status(404).send("Not Found");
    } else {
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching record");
  }
});


 
// POST new record
router.post("/", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");

    const year = new Date().getFullYear();
    const countForYear = await collection.countDocuments({
      _id: { $regex: `^${year}-` },
    });

    const newId = `${year}-${String(countForYear + 1).padStart(4, "0")}`;

    // Generate embedding for semantic search (combine title + abstract)
    const textToEmbed = `${req.body.title} ${req.body.abstract}`;
    const embedding = await generateEmbedding(textToEmbed);

    const newDocument = {
      _id: newId,
      title: req.body.title,
      abstract: req.body.abstract,
      submitted_at: new Date(),
      access_level: req.body.access_level,
      authors: req.body.authors,
      tags: req.body.tags,
      embedding: embedding // <--- store embedding here
    };

    const result = await collection.insertOne(newDocument);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// POST new records (bulk insert)
router.post("/bulk", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");
    const year = new Date().getFullYear();

    let countForYear = await collection.countDocuments({
      _id: { $regex: `^${year}-` },
    });

    if (!Array.isArray(req.body)) {
      return res.status(400).send("Request body must be an array of records");
    }

    const newDocuments = await Promise.all(
      req.body.map(async (doc, index) => {
        const newId = `${year}-${String(countForYear + index + 1).padStart(4, "0")}`;
        const textToEmbed = `${doc.title} ${doc.abstract}`;
        const embedding = await generateEmbedding(textToEmbed);

        return {
          _id: newId,
          title: doc.title,
          abstract: doc.abstract,
          submitted_at: new Date(),
          access_level: doc.access_level,
          authors: Array.isArray(doc.authors) ? doc.authors : [],
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          embedding: embedding // <--- store embedding here
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
    res.status(500).send("Error adding records");
  }
});

//POST search document
router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const results = await semanticSearch(query, 5);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error performing semantic search");
  }
});

// DELETE a document
router.delete("/:id", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");

    const result = await collection.deleteOne({ _id: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).send("Record not found");
    }

    res.status(200).send(`Record ${req.params.id} deleted successfully`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});

// PUT update a record by ID
router.put("/:id", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");

    const { id } = req.params;

    // Build update object
    const updateFields = {};
    if (req.body.title) updateFields.title = req.body.title;
    if (req.body.abstract) updateFields.abstract = req.body.abstract;
    if (req.body.access_level) updateFields.access_level = req.body.access_level;
    if (req.body.authors) updateFields.authors = req.body.authors;
    if (req.body.tags) updateFields.tags = req.body.tags;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send("No fields provided to update");
    }

    const result = await collection.updateOne(
      { _id: id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send("Record not found");
    }

    res.json({
      message: "Record updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});




export default router;
