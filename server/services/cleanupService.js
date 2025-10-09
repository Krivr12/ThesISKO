import cron from "node-cron";
import db from "../databaseConnections/mongodb_connection.js";

const collection = db.collection("requests");

// Run daily at midnight
cron.schedule("0 0 * * *", async () => {
  const expiryDays = 90; // keep for 90 days
  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  try {
    const oldRequests = await collection.find({ updatedAt: { $lt: cutoff } }).toArray();
    await db.collection("requests_archive").insertMany(oldRequests);
    await collection.deleteMany({ updatedAt: { $lt: cutoff } });

    console.log("Cleanup done:", new Date().toISOString());
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
});
