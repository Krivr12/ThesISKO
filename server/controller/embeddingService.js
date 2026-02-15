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
 * Calculate optimal numCandidates for vector search
 * 
 * @param {number} topK - Number of results to return
 * @param {number} totalDocuments - Total number of documents in collection
 * @param {number} customNumCandidates - Optional custom value (overrides calculation)
 * @returns {number} - Optimal numCandidates value
 */
function calculateNumCandidates(topK = 5, totalDocuments = null, customNumCandidates = null) {
  // If custom value provided, use it (with reasonable bounds)
  if (customNumCandidates !== null && customNumCandidates > 0) {
    return Math.min(Math.max(customNumCandidates, 10), 1000); // Clamp between 10 and 1000
  }

  // Base calculation: numCandidates should be a multiple of topK
  // This ensures we have enough candidates to find the best matches
  // Formula: topK * multiplier, with minimum and maximum bounds
  
  // For small result sets (topK <= 5), use higher multiplier for better accuracy
  // For larger result sets (topK > 20), use lower multiplier for efficiency
  let multiplier;
  if (topK <= 5) {
    multiplier = 20; // 5 results = 100 candidates (high accuracy for small sets)
  } else if (topK <= 10) {
    multiplier = 15; // 10 results = 150 candidates
  } else if (topK <= 20) {
    multiplier = 10; // 20 results = 200 candidates
  } else {
    multiplier = 8; // 30+ results = 240+ candidates (efficient for large sets)
  }

  let numCandidates = topK * multiplier;

  // If we know the total document count, cap it at a reasonable percentage
  if (totalDocuments !== null && totalDocuments > 0) {
    // Don't search more than 50% of the collection (unless it's very small)
    const maxCandidates = Math.max(
      Math.ceil(totalDocuments * 0.5), // 50% of collection
      100 // Minimum 100 for small collections
    );
    numCandidates = Math.min(numCandidates, maxCandidates);
  }

  // Ensure minimum and maximum bounds
  const minCandidates = Math.max(topK * 2, 50); // At least 2x topK, minimum 50
  const maxCandidates = 500; // Maximum 500 for performance (can be adjusted)

  numCandidates = Math.max(minCandidates, Math.min(numCandidates, maxCandidates));

  return Math.round(numCandidates);
}

/**
 * Perform hybrid semantic + keyword search in MongoDB Atlas.
 * Uses $vectorSearch first, then filters via text relevance if needed.
 *
 * @param {string} query - Natural language or keyword-based query
 * @param {number} topK - Number of results to return
 * @param {number} numCandidates - Optional custom numCandidates (if not provided, calculated dynamically)
 * @returns {Promise<object[]>} - Matching records
 */
export async function semanticSearch(query, topK = 5, numCandidates = null) {
  const collection = RepoMongodb.collection("records");

  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("❌ Invalid search query");
  }

  // Get total document count for dynamic calculation (cached for performance)
  let totalDocuments = null;
  try {
    totalDocuments = await collection.countDocuments({ abstract_embedding: { $exists: true } });
  } catch (err) {
    console.warn("⚠️ Could not get document count, using default numCandidates calculation");
  }

  // Calculate optimal numCandidates dynamically
  const optimalNumCandidates = calculateNumCandidates(topK, totalDocuments, numCandidates);

  // Generate the query embedding
  const queryEmbedding = await generateEmbedding(query);

  try {
    const results = await collection.aggregate([
      {
        $vectorSearch: {
          index: "AbstractSemanticSearch",
          path: "abstract_embedding",
          queryVector: queryEmbedding,
          numCandidates: optimalNumCandidates,
          limit: topK,
          similarity: "dotProduct",
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
      {
        $match: {
          score: { $gte: 0.6 },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          year: 1,
          authors: 1,
          tags: 1,
          score: 1,
        },
      },
    ]).toArray();

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
