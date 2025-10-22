// embeddingService.js
import { pipeline } from "@xenova/transformers";
import RepoMongodb from "../databaseConnections/MongoDB/mongodb_connection.js";

// Global singleton for the embedding model
let embedder = null;

/**
 * Load the embedding model once and reuse across requests
 */
async function loadModel() {
  if (!embedder) {
    console.log("🧠 Loading embedding model (Xenova/all-MiniLM-L12-v2)...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L12-v2");
    console.log("✅ Embedding model loaded!");
  }
  return embedder;
}

/**
 * Generate a normalized embedding for any given text.
 * Safe against invalid or empty input.
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("❌ Invalid input: text must be a non-empty string");
  }

  try {
    const model = await loadModel();
    const output = await model(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error("⚠️ Embedding generation failed:", err.message);
    throw err;
  }
}

/**
 * Perform hybrid semantic + keyword search in MongoDB Atlas.
 * Uses $vectorSearch first, then filters via text relevance if needed.
 *
 * @param {string} query - Natural language or keyword-based query
 * @param {number} topK - Number of results to return
 * @returns {Promise<object[]>} - Matching records
 */
export async function semanticSearch(query, topK = 5) {
  const collection = RepoMongodb.collection("records");

  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("❌ Invalid search query");
  }

  // Generate the query embedding
  const queryEmbedding = await generateEmbedding(query);

  try {
    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: "AbstractSemanticSearch",
          path: "abstract_embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: topK,
          similarity: "dotProduct",
        },
      },
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          submitted_at: 1,
          authors: 1,
          tags: 1,
          score: 1,
        },
      },
    ]).toArray();

    console.log(`🔍 Semantic search: ${results.length} results returned`);
    console.log(`🔍 Raw results:`, results.slice(0, 3).map(r => ({ title: r.title, score: r.score })));
    return results;
  } catch (err) {
    console.error("⚠️ Semantic search failed:", err.message);
    throw err;
  }
}

/**
 * Preload model at startup (optional but recommended)
 */
export async function preloadModel() {
  try {
    await loadModel();
  } catch (err) {
    console.error("⚠️ Failed to preload model:", err.message);
  }
}
