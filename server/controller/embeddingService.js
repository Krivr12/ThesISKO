// embeddingService.js
import { pipeline } from "@xenova/transformers";
import RepoMongodb from "../RepoMongodb/connection.js";
let embedder = null;

/**
 * Load embedding model once
 */
async function loadModel() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model loaded!");
  }
  return embedder;
}

/**
 * Generate embedding for given text
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim() === "") {
    throw new Error("Invalid input: text must be a non-empty string");
  }

  const model = await loadModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Perform semantic search using MongoDB Atlas Vector Search
 * @param {string} query - Search text
 * @param {number} topK - Number of nearest neighbors
 * @returns {Promise<object[]>} - Search results
 */
export async function semanticSearch(query, topK = 5) {
  const collection = RepoMongodb.collection("records");

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Run $vectorSearch aggregation
  const cursor = await collection.aggregate([
    {
      $vectorSearch: {
        index: "AbstractSemanticSearch", // ✅ match your Atlas index name
        path: "abstract_embedding",
        queryVector: queryEmbedding,
        numCandidates: 100, // larger candidate pool improves accuracy
        limit: topK,
        similarity: "dotProduct" // ✅ match your index definition
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        submitted_at: 1,
        authors: 1,
        tags: 1,
      }
    }
  ]);

  return cursor.toArray();
}
