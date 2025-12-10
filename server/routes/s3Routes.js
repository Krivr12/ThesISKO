import express from "express";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();

// Generate signed URL for uploading a single file (for groups)
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
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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

// Generate signed URL for uploading a single file (for individual submissions)
router.post("/submission/signed-url", async (req, res) => {
  try {
    const { submission_id, filename, contentType } = req.body;
    if (!submission_id || !filename || !contentType) {
      return res
        .status(400)
        .json({ error: "Missing submission_id, filename, or contentType" });
    }

    const key = `submission/${submission_id}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ uploadUrl, key });
  } catch (err) {
    console.error("Submission signed URL error:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

// Generate signed URLs for uploading multiple files (for groups)
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
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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

// Generate signed URLs for uploading multiple files (for individual submissions)
router.post("/submission/signed-urls", async (req, res) => {
  try {
    const { submission_id, files } = req.body; // expected: { submission_id, files: [{ filename, contentType }] }
    if (!submission_id || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Missing submission_id or files array" });
    }

    const urls = await Promise.all(
      files.map(async ({ filename, contentType }) => {
        const key = `submission/${submission_id}/${filename}`;
        const command = new PutObjectCommand({
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
          Key: key,
          ContentType: contentType,
        });
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return { key, uploadUrl };
      })
    );

    res.json({ urls });
  } catch (err) {
    console.error("Submission multiple signed URLs error:", err);
    res.status(500).json({ error: "Failed to generate signed URLs" });
  }
});

// Fetch signed URLs for viewing or downloading existing files (for groups)
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
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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

// Fetch signed URLs for viewing or downloading existing files (for individual submissions)
router.post("/submission/view-urls", async (req, res) => {
  try {
    const { submission_id, filenames } = req.body; // expected: { submission_id, filenames: ["file1.pdf", "file2.pdf"] }
    if (!submission_id || !Array.isArray(filenames) || filenames.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing submission_id or filenames array" });
    }

    const urls = await Promise.all(
      filenames.map(async (filename) => {
        const key = `submission/${submission_id}/${filename}`;
        const command = new GetObjectCommand({
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        return { key, signedUrl };
      })
    );

    res.json({ urls });
  } catch (err) {
    console.error("Submission view signed URLs error:", err);
    res.status(500).json({ error: "Failed to fetch signed URLs" });
  }
});

// Delete a file from S3 (for groups)
router.delete("/file", async (req, res) => {
  try {
    const { group_id, filename } = req.body;
    if (!group_id || !filename)
      return res.status(400).json({ error: "Missing group_id or filename" });

    const key = `submission/${group_id}/${filename}`;

    const command = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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

// Delete a file from S3 (for individual submissions)
router.delete("/submission/file", async (req, res) => {
  try {
    const { submission_id, filename } = req.body;
    if (!submission_id || !filename)
      return res.status(400).json({ error: "Missing submission_id or filename" });

    const key = `submission/${submission_id}/${filename}`;

    const command = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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
    console.error("Submission delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Update file by removing old and returning signed URL for new upload (for groups)
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
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: oldKey,
    });
    await s3.send(deleteCmd);

    // generate signed url for new file
    const putCmd = new PutObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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

// Update file by removing old and returning signed URL for new upload (for individual submissions)
router.post("/submission/update-file", async (req, res) => {
  try {
    const { submission_id, oldFilename, newFilename, contentType } = req.body;
    if (!submission_id || !oldFilename || !newFilename || !contentType) {
      return res.status(400).json({
        error: "Missing submission_id, oldFilename, newFilename, or contentType",
      });
    }

    const oldKey = `submission/${submission_id}/${oldFilename}`;
    const newKey = `submission/${submission_id}/${newFilename}`;

    // delete old file
    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: oldKey,
    });
    await s3.send(deleteCmd);

    // generate signed url for new file
    const putCmd = new PutObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
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
    console.error("Submission update file error:", err);
    res.status(500).json({ error: "Failed to update file" });
  }
});

/**
 * Clean file key by removing any signed URL tokens that might be appended
 * @param {string} fileKey - Potentially corrupted file key
 * @returns {string} Clean S3 key
 */
function cleanFileKey(fileKey) {
  if (!fileKey || typeof fileKey !== 'string') {
    return fileKey;
  }
  
  // Remove query parameters if present
  const queryParamIndex = fileKey.indexOf('?');
  if (queryParamIndex !== -1) {
    fileKey = fileKey.substring(0, queryParamIndex);
  }
  
  // Pattern to match valid S3 key: repository-files/DOCUMENT_ID/filename.ext
  // Valid S3 keys should not have very long strings after file extensions
  const validKeyPattern = /^(repository-files|submission)\/[^\/]+\/[^\/]+\.(pdf|doc|docx|txt|rtf|xlsx|xls|pptx|ppt)([A-Za-z0-9\/\+\=\-]{0,20})?$/;
  
  // If the key matches the pattern and is reasonable length, return as-is
  if (validKeyPattern.test(fileKey) && fileKey.length < 200) {
    return fileKey;
  }
  
  // If key is too long or doesn't match pattern, extract the clean part
  // Look for the file extension and truncate after it (with small buffer for normal chars)
  const extensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xlsx', '.xls', '.pptx', '.ppt'];
  
  for (const ext of extensions) {
    const extIndex = fileKey.indexOf(ext);
    if (extIndex !== -1) {
      const endIndex = extIndex + ext.length;
      // If there's a lot of content after the extension, it's likely a token
      if (fileKey.length > endIndex + 30) {
        const cleaned = fileKey.substring(0, endIndex);
        console.log(`🧹 [S3] Cleaned file key: removed ${fileKey.length - cleaned.length} chars of token`);
        return cleaned;
      }
    }
  }
  
  // Fallback: if key is suspiciously long, try to find a reasonable cutoff
  if (fileKey.length > 200) {
    // Look for pattern: path/filename.ext and take everything up to and including the extension
    const match = fileKey.match(/^((?:repository-files|submission)\/[^\/]+\/[^\/]+\.(?:pdf|doc|docx|txt|rtf|xlsx|xls|pptx|ppt))/);
    if (match && match[1]) {
      console.log(`🧹 [S3] Cleaned file key: extracted clean path (${match[1].length} chars)`);
      return match[1];
    }
  }
  
  return fileKey;
}

// Generate signed URL for viewing repository file (approved documents)
router.post("/view-repository-file", async (req, res) => {
  try {
    let { file_key } = req.body;
    
    if (!file_key) {
      return res.status(400).json({ error: "Missing file_key" });
    }

    // Clean the file key to remove any signed URL tokens
    const originalFileKey = file_key;
    file_key = cleanFileKey(file_key);
    
    if (file_key !== originalFileKey) {
      console.log(`🧹 [S3] Cleaned file key:`);
      console.log(`   Original: ${originalFileKey.substring(0, 100)}...`);
      console.log(`   Cleaned:  ${file_key}`);
    }

    // Smart bucket selection based on key prefix
    let bucket;
    if (file_key.startsWith('submission/')) {
      // Submission files are in the documents bucket
      bucket = process.env.THESISKO_DOCUMENTS_BUCKET;
      console.log(`📄 [S3] Viewing submission file from documents bucket: ${file_key}`);
    } else if (file_key.startsWith('repository-files/')) {
      // Repository files are in the repository bucket
      bucket = process.env.THESISKO_REPOSITORY_BUCKET || process.env.THESISKO_DOCUMENTS_BUCKET;
      console.log(`📚 [S3] Viewing repository file from repository bucket: ${file_key}`);
    } else {
      // Fallback to documents bucket for unknown prefixes
      bucket = process.env.THESISKO_DOCUMENTS_BUCKET;
      console.log(`⚠️ [S3] Unknown prefix, using documents bucket: ${file_key}`);
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: file_key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    
    res.json({ 
      signedUrl,
      expiresIn: 300  // 5 minutes
    });
  } catch (err) {
    console.error("❌ [S3] View file error:", err);
    console.error("❌ [S3] File key:", req.body?.file_key);
    res.status(500).json({ error: "Failed to generate signed URL for viewing" });
  }
});

export default router;
