import { uploadLogsToS3 } from "../server/scripts/uploadLogsToS3.js";
import db from "../server/databaseConnections/MongoDB/mongodb_connection.js";

test("Uploads logs and clears collection", async () => {
  const logs = db.collection("error_logs");
  await logs.insertOne({ message: "Test error", timestamp: new Date() });

  await uploadLogsToS3();

  const remaining = await logs.countDocuments();
  expect(remaining).toBe(0);
});
