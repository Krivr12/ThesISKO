// abstractEmbedding.js
import { pipeline } from "@xenova/transformers";

// Load once on startup
let embedder = null;

async function loadModel() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model loaded!");
  }
  return embedder;
}

// Generate embedding for abstract
export async function generateAbstractEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim() === "") {
    return []; // fallback: empty embedding
  }

  const model = await loadModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data); // array of floats (length = 384)
}




// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { MongoClient } from "mongodb";
// import { pipeline } from "@xenova/transformers";

// dotenv.config();

// const MONGO_URI = process.env.MONGO_URI;
// const MONGO_DB = process.env.MONGO_DB;
// const MONGO_COLLECTION = process.env.MONGO_COLLECTION;
// const VECTOR_INDEX = process.env.VECTOR_INDEX;

// const app = express();
// app.use(cors({ origin: "http://localhost:4200" }));
// app.use(express.json());

// // MongoDB connection
// const client = new MongoClient(MONGO_URI);
// await client.connect();
// const db = client.db(MONGO_DB);
// const collection = db.collection(MONGO_COLLECTION);

// // Load embedding model
// console.log("Loading model...");
// const embedder = await pipeline(
//   "feature-extraction",
//   "Xenova/all-MiniLM-L6-v2"
// );
// console.log("Model loaded!");

// // Generate embedding (384 dims)
// async function generateEmbedding(text) {
//   const output = await embedder(text, { pooling: "mean", normalize: true });
//   return Array.from(output.data);
// }

// // Search movies with vector search
// async function searchMovies(query, limit = 30) {
//   const embedding = await generateEmbedding(query);
//   console.log("Embedding length:", embedding.length); // Should be 384

//   const results = await collection
//     .aggregate([
//       {
//         $vectorSearch: {
//           queryVector: embedding,
//           path: "plot_embedding_hf",
//           numCandidates: 100,
//           limit: limit,
//           index: VECTOR_INDEX,
//         },
//       },
//     ])
//     .toArray();

//   return results.map((r) => ({
//     title: r.title,
//     plot: r.plot,
//   }));
// }

// // Get latest movies
// async function getLatestMovies(limit = 6) {
//   return await collection
//     .find({}, { projection: { _id: 0, title: 1, plot: 1, released: 1 } })
//     .sort({ released: -1 })
//     .limit(limit)
//     .toArray();
// }

// // Routes
// app.post("/search", async (req, res) => {
//   try {
//     const { text } = req.body;
//     if (!text) {
//       return res.status(400).json({ error: "Missing 'text' in request body" });
//     }

//     const results = await searchMovies(text);
//     res.json({ results });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/latest", async (req, res) => {
//   try {
//     const results = await getLatestMovies();
//     res.json({ latest_movies: results });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Start server
// app.listen(8000, () => console.log("✅ Server running on port 8000"));
