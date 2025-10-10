import express from "express";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();

// Generate signed URL for uploading a single file
router.post("/signed-url", async (req, res) => {
  try {
    const { group_id, filename, contentType } = req.body;
    if (!group_id || !filename || !contentType) {
      return res
        .status(400)
        .json({ error: "Missing group_id, filename, or contentType" });
    }

    const key = `submission/${group_id}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error("Signed URL error:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

// Generate signed URLs for uploading multiple files
router.post("/signed-urls", async (req, res) => {
  try {
    const { group_id, files } = req.body; // expected: { group_id, files: [{ filename, contentType }] }
    if (!group_id || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Missing group_id or files array" });
    }

    const urls = await Promise.all(
      files.map(async ({ filename, contentType }) => {
        const key = `submission/${group_id}/${filename}`;
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: contentType,
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return { key, uploadUrl };
      })
    );

    res.json({ urls });
  } catch (err) {
    console.error("Multiple signed URLs error:", err);
    res.status(500).json({ error: "Failed to generate signed URLs" });
  }
});

// Fetch signed URLs for viewing or downloading existing files
router.post("/view-urls", async (req, res) => {
  try {
    const { group_id, filenames } = req.body; // expected: { group_id, filenames: ["file1.pdf", "file2.pdf"] }
    if (!group_id || !Array.isArray(filenames) || filenames.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing group_id or filenames array" });
    }

    const urls = await Promise.all(
      filenames.map(async (filename) => {
        const key = `submission/${group_id}/${filename}`;
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return { key, signedUrl };
      })
    );

    res.json({ urls });
  } catch (err) {
    console.error("View signed URLs error:", err);
    res.status(500).json({ error: "Failed to fetch signed URLs" });
  }
});

// Delete a file from S3
router.delete("/file", async (req, res) => {
  try {
    const { group_id, filename } = req.body;
    if (!group_id || !filename)
      return res.status(400).json({ error: "Missing group_id or filename" });

    const key = `submission/${group_id}/${filename}`;

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    try {
      await s3.send(command);
      res.json({ message: "File deleted successfully", key });
    } catch (s3Error) {
      if (s3Error.name === 'NoSuchKey') {
        // File doesn't exist, but that's okay for delete operations
        res.json({ message: "File already deleted or doesn't exist", key });
      } else {
        throw s3Error; // Re-throw for other S3 errors
      }
    }
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Update file by removing old and returning signed URL for new upload
router.post("/update-file", async (req, res) => {
  try {
    const { group_id, oldFilename, newFilename, contentType } = req.body;
    if (!group_id || !oldFilename || !newFilename || !contentType) {
      return res.status(400).json({
        error: "Missing group_id, oldFilename, newFilename, or contentType",
      });
    }

    const oldKey = `submission/${group_id}/${oldFilename}`;
    const newKey = `submission/${group_id}/${newFilename}`;

    // delete old file
    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: oldKey,
    });
    await s3.send(deleteCmd);

    // generate signed url for new file
    const putCmd = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: newKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 300 });

    res.json({
      message: "Old file removed. Use this URL to upload new file.",
      uploadUrl,
      key: newKey,
    });
  } catch (err) {
    console.error("Update file error:", err);
    res.status(500).json({ error: "Failed to update file" });
  }
});

export default router;
