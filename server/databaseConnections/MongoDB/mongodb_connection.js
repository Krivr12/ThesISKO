import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: "config.env" });

const uri = process.env.ATLAS_URI || "";

<<<<<<< HEAD
let client;
let db;
=======
console.log("ATLAS_URI from env:", process.env.ATLAS_URI);


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});
>>>>>>> dev-Chris

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
