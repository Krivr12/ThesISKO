// server/routes/s3Search.js
import express from "express";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import s3 from "../s3Bucket/s3.js";

const router = express.Router();

// Search files by name
router.get("/search", async (req, res) => {
  try {
    const { filename } = req.query; // e.g. /s3/search?filename=UploadFunction

    if (!filename) {
      return res.status(400).json({ error: "Filename query is required" });
    }

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: "submission/", // optional: if you store inside 'submission/'
    });

    const data = await s3.send(command);

    // Filter objects by matching filename
    const matches = (data.Contents || []).filter((obj) =>
      obj.Key.toLowerCase().includes(filename.toLowerCase())
    );

    if (matches.length === 0) {
      return res.status(404).json({ message: "No files found" });
    }

    res.json({
      results: matches.map((file) => ({
        key: file.Key,
        lastModified: file.LastModified,
        size: file.Size,
      })),
    });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "File search failed" });
  }
});

export default router;

