import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import db from "../databaseConnections/MongoDB/mongodb_connection.js";

const logsCollection = db.collection("error_logs");

async function uploadLogsToS3() {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const logs = await logsCollection.find({}).toArray();

    if (!logs.length) {
      console.log("✅ No logs to upload today.");
      return;
    }

    const s3Key = `errors/${today}.json`;
    const jsonData = JSON.stringify(logs, null, 2);

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `thesisko-logs/${s3Key}`,
        Body: jsonData,
        ContentType: "application/json",
      })
    );

    console.log(`✅ Uploaded ${logs.length} logs to S3 → ${s3Key}`);

    // Cleanup Mongo logs to prevent accumulation
    await logsCollection.deleteMany({});
    console.log("🧹 Cleared logs collection after upload.");
  } catch (err) {
    console.error("❌ Failed to upload logs:", err.message);
  }
}

uploadLogsToS3()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
