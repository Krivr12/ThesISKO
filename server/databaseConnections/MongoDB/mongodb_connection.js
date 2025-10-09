import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.ATLAS_URI || "";

let client;
let db;

if (uri && uri.startsWith("mongodb")) {
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. Connected to MongoDB Atlas!");
    db = client.db("DocumentsRepo");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    console.log("⚠️ Continuing without MongoDB connection...");
    db = null;
  }
} else {
  console.log("⚠️ No MongoDB URI provided, continuing without MongoDB...");
  db = null;
}

export default db;
