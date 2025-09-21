import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.ATLAS_URI || "";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✅ Pinged your deployment. Connected to MongoDB Atlas!");
} catch (err) {
  console.error("❌ MongoDB connection error:", err);
}

const db = client.db("DocumentsRepo");
export default db;
