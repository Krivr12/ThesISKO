import express from "express";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../middlewares/authMiddleware.js";
import pool from "../data/database.js";
import { getDb } from "../databaseConnections/MongoDB/mongodb_connection.js";

const router = express.Router();

/** Role IDs that can access any submission/group file */
const STAFF_ROLES = [3, 4, 5]; // Faculty, Chairperson, Dean/Superadmin

/**
 * Check whether the authenticated user is a member (or leader) of a group.
 * Queries the PostgreSQL group_members table.
 *
 * @param {string} group_id
 * @param {number} user_id  - req.user.id or req.user.user_id
 * @returns {Promise<boolean>}
 */
async function isGroupMember(group_id, user_id) {
  const result = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1",
    [group_id, user_id]
  );
  return result.rows.length > 0;
}

/**
 * Check whether the authenticated user owns a submission (is the submitter).
 * Queries the MongoDB submissions collection.
 *
 * @param {string} submission_id
 * @param {string} email - req.user.email or req.user.Email
 * @returns {Promise<boolean>}
 */
async function isSubmissionOwner(submission_id, email) {
  const submissionsCollection = getDb().collection("submissions");
  const submission = await submissionsCollection.findOne({ submission_id });
  if (!submission) return false;
  return submission.submitter_email?.toLowerCase() === email.toLowerCase();
}

/**
 * Authorisation helper — resolves whether the current user may act on a
 * group-scoped resource.
 *
 * Staff roles always pass. Students/group leaders must be a member of the group.
 *
 * @param {object} user  - req.user
 * @param {string} group_id
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function authorizeGroupAccess(user, group_id) {
  if (STAFF_ROLES.includes(user.role_id)) {
    return { allowed: true };
  }
  const userId = user.id ?? user.user_id;
  if (!userId) {
    return { allowed: false, reason: "User ID not found in session" };
  }
  const member = await isGroupMember(group_id, userId);
  if (!member) {
    return {
      allowed: false,
      reason: "You are not a member of this group",
    };
  }
  return { allowed: true };
}

/**
 * Authorisation helper — resolves whether the current user may act on a
 * submission-scoped resource.
 *
 * Staff roles always pass. Students must be the submitter.
 *
 * @param {object} user  - req.user
 * @param {string} submission_id
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function authorizeSubmissionAccess(user, submission_id) {
  if (STAFF_ROLES.includes(user.role_id)) {
    return { allowed: true };
  }
  const email = user.email ?? user.Email;
  if (!email) {
    return { allowed: false, reason: "User email not found in session" };
  }
  const owner = await isSubmissionOwner(submission_id, email);
  if (!owner) {
    return {
      allowed: false,
      reason: "You are not the submitter of this submission",
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// UPLOAD — signed URL for a single file (group)
// ---------------------------------------------------------------------------
router.post("/signed-url", requireAuth, async (req, res) => {
  try {
    const { group_id, filename, contentType } = req.body;
    if (!group_id || !filename || !contentType) {
      return res
        .status(400)
        .json({ error: "Missing group_id, filename, or contentType" });
    }

    const auth = await authorizeGroupAccess(req.user, group_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// UPLOAD — signed URL for a single file (individual submission)
// ---------------------------------------------------------------------------
router.post("/submission/signed-url", requireAuth, async (req, res) => {
  try {
    const { submission_id, filename, contentType } = req.body;
    if (!submission_id || !filename || !contentType) {
      return res
        .status(400)
        .json({ error: "Missing submission_id, filename, or contentType" });
    }

    const auth = await authorizeSubmissionAccess(req.user, submission_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// UPLOAD — signed URLs for multiple files (group)
// ---------------------------------------------------------------------------
router.post("/signed-urls", requireAuth, async (req, res) => {
  try {
    const { group_id, files } = req.body;
    if (!group_id || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Missing group_id or files array" });
    }

    const auth = await authorizeGroupAccess(req.user, group_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// UPLOAD — signed URLs for multiple files (individual submission)
// ---------------------------------------------------------------------------
router.post("/submission/signed-urls", requireAuth, async (req, res) => {
  try {
    const { submission_id, files } = req.body;
    if (!submission_id || !Array.isArray(files) || files.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing submission_id or files array" });
    }

    const auth = await authorizeSubmissionAccess(req.user, submission_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// VIEW — signed URLs for existing files (group)
// ---------------------------------------------------------------------------
router.post("/view-urls", requireAuth, async (req, res) => {
  try {
    const { group_id, filenames } = req.body;
    if (!group_id || !Array.isArray(filenames) || filenames.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing group_id or filenames array" });
    }

    const auth = await authorizeGroupAccess(req.user, group_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// VIEW — signed URLs for existing files (individual submission)
// ---------------------------------------------------------------------------
router.post("/submission/view-urls", requireAuth, async (req, res) => {
  try {
    const { submission_id, filenames } = req.body;
    if (!submission_id || !Array.isArray(filenames) || filenames.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing submission_id or filenames array" });
    }

    const auth = await authorizeSubmissionAccess(req.user, submission_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
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

// ---------------------------------------------------------------------------
// DELETE — remove a file from S3 (group)
// ---------------------------------------------------------------------------
router.delete("/file", requireAuth, async (req, res) => {
  try {
    const { group_id, filename } = req.body;
    if (!group_id || !filename) {
      return res.status(400).json({ error: "Missing group_id or filename" });
    }

    const auth = await authorizeGroupAccess(req.user, group_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
    }

    const key = `submission/${group_id}/${filename}`;
    const command = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: key,
    });

    try {
      await s3.send(command);
      res.json({ message: "File deleted successfully", key });
    } catch (s3Error) {
      if (s3Error.name === "NoSuchKey") {
        res.json({ message: "File already deleted or doesn't exist", key });
      } else {
        throw s3Error;
      }
    }
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// ---------------------------------------------------------------------------
// DELETE — remove a file from S3 (individual submission)
// ---------------------------------------------------------------------------
router.delete("/submission/file", requireAuth, async (req, res) => {
  try {
    const { submission_id, filename } = req.body;
    if (!submission_id || !filename) {
      return res
        .status(400)
        .json({ error: "Missing submission_id or filename" });
    }

    const auth = await authorizeSubmissionAccess(req.user, submission_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
    }

    const key = `submission/${submission_id}/${filename}`;
    const command = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: key,
    });

    try {
      await s3.send(command);
      res.json({ message: "File deleted successfully", key });
    } catch (s3Error) {
      if (s3Error.name === "NoSuchKey") {
        res.json({ message: "File already deleted or doesn't exist", key });
      } else {
        throw s3Error;
      }
    }
  } catch (err) {
    console.error("Submission delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// ---------------------------------------------------------------------------
// UPDATE — replace a file (group)
// ---------------------------------------------------------------------------
router.post("/update-file", requireAuth, async (req, res) => {
  try {
    const { group_id, oldFilename, newFilename, contentType } = req.body;
    if (!group_id || !oldFilename || !newFilename || !contentType) {
      return res.status(400).json({
        error: "Missing group_id, oldFilename, newFilename, or contentType",
      });
    }

    const auth = await authorizeGroupAccess(req.user, group_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
    }

    const oldKey = `submission/${group_id}/${oldFilename}`;
    const newKey = `submission/${group_id}/${newFilename}`;

    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: oldKey,
    });
    await s3.send(deleteCmd);

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

// ---------------------------------------------------------------------------
// UPDATE — replace a file (individual submission)
// ---------------------------------------------------------------------------
router.post("/submission/update-file", requireAuth, async (req, res) => {
  try {
    const { submission_id, oldFilename, newFilename, contentType } = req.body;
    if (!submission_id || !oldFilename || !newFilename || !contentType) {
      return res.status(400).json({
        error:
          "Missing submission_id, oldFilename, newFilename, or contentType",
      });
    }

    const auth = await authorizeSubmissionAccess(req.user, submission_id);
    if (!auth.allowed) {
      return res.status(403).json({ error: "Forbidden", message: auth.reason });
    }

    const oldKey = `submission/${submission_id}/${oldFilename}`;
    const newKey = `submission/${submission_id}/${newFilename}`;

    const deleteCmd = new DeleteObjectCommand({
      Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
      Key: oldKey,
    });
    await s3.send(deleteCmd);

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

// ---------------------------------------------------------------------------
// Utility: strip any signed-URL query tokens accidentally appended to a key
// ---------------------------------------------------------------------------
function cleanFileKey(fileKey) {
  if (!fileKey || typeof fileKey !== "string") {
    return fileKey;
  }

  // Remove query parameters if present
  const queryParamIndex = fileKey.indexOf("?");
  if (queryParamIndex !== -1) {
    fileKey = fileKey.substring(0, queryParamIndex);
  }

  const validKeyPattern =
    /^(repository-files|submission)\/[^\/]+\/[^\/]+\.(pdf|doc|docx|txt|rtf|xlsx|xls|pptx|ppt)([A-Za-z0-9\/\+\=\-]{0,20})?$/;

  if (validKeyPattern.test(fileKey) && fileKey.length < 200) {
    return fileKey;
  }

  const extensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",
    ".xlsx",
    ".xls",
    ".pptx",
    ".ppt",
  ];

  for (const ext of extensions) {
    const extIndex = fileKey.lastIndexOf(ext);
    if (extIndex !== -1) {
      const endIndex = extIndex + ext.length;
      const afterExtension = fileKey.substring(endIndex);
      if (
        afterExtension.length > 30 &&
        /^[A-Za-z0-9\/\+\=\-]{30,}$/.test(afterExtension)
      ) {
        const cleaned = fileKey.substring(0, endIndex);
        console.log(
          `🧹 [S3] Cleaned file key: removed ${fileKey.length - cleaned.length} chars of token`
        );
        return cleaned;
      }
    }
  }

  if (fileKey.length > 200) {
    const match = fileKey.match(
      /^((?:repository-files|submission)\/[^\/]+\/[^\/]+\.(?:pdf|doc|docx|txt|rtf|xlsx|xls|pptx|ppt))/
    );
    if (match && match[1]) {
      console.log(
        `🧹 [S3] Cleaned file key: extracted clean path (${match[1].length} chars)`
      );
      return match[1];
    }
  }

  return fileKey;
}

// ---------------------------------------------------------------------------
// VIEW — repository or submission file (admin/faculty review + students own)
//
// Authorization rules:
//   submission/ prefix  → submitter OR staff (role 3/4/5)
//   repository-files/   → any authenticated user (document is approved/public)
// ---------------------------------------------------------------------------
router.post("/view-repository-file", requireAuth, async (req, res) => {
  try {
    let { file_key } = req.body;

    if (!file_key) {
      return res.status(400).json({ error: "Missing file_key" });
    }

    // Strip any accidentally appended signed-URL tokens
    const originalFileKey = file_key;
    file_key = cleanFileKey(file_key);

    if (file_key !== originalFileKey) {
      console.log(`🧹 [S3] Cleaned file key:`);
      console.log(`   Original: ${originalFileKey.substring(0, 100)}...`);
      console.log(`   Cleaned:  ${file_key}`);
    }

    // -----------------------------------------------------------------------
    // Authorization by key prefix
    // -----------------------------------------------------------------------
    if (file_key.startsWith("submission/")) {
      // Extract submission_id from key: "submission/<id>/filename"
      const parts = file_key.split("/");
      const submission_id = parts[1];

      if (!submission_id) {
        return res
          .status(400)
          .json({ error: "Malformed file key: cannot determine submission_id" });
      }

      const auth = await authorizeSubmissionAccess(req.user, submission_id);
      if (!auth.allowed) {
        console.warn(
          `[S3] ⛔ Unauthorized attempt to access submission file by user ${req.user.email ?? req.user.Email} for submission ${submission_id}`
        );
        return res
          .status(403)
          .json({ error: "Forbidden", message: auth.reason });
      }
    } else if (file_key.startsWith("repository-files/")) {
      // Repository files are approved/published documents.
      // Any authenticated user may view them — no extra check needed.
      // (requireAuth above already gates unauthenticated requests.)
    } else {
      // Unknown prefix — deny to be safe
      console.warn(
        `[S3] ⛔ Unknown file key prefix rejected: ${file_key.substring(0, 60)}`
      );
      return res
        .status(400)
        .json({ error: "Unknown file key prefix" });
    }

    // -----------------------------------------------------------------------
    // Smart bucket selection
    // -----------------------------------------------------------------------
    let bucket;
    if (file_key.startsWith("submission/")) {
      bucket = process.env.THESISKO_DOCUMENTS_BUCKET;
      console.log(`📄 [S3] Viewing submission file: ${file_key}`);
    } else {
      bucket =
        process.env.THESISKO_REPOSITORY_BUCKET ||
        process.env.THESISKO_DOCUMENTS_BUCKET;
      console.log(`📚 [S3] Viewing repository file: ${file_key}`);
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: file_key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({
      signedUrl,
      expiresIn: 300,
    });
  } catch (err) {
    console.error("❌ [S3] View file error:", err);
    console.error("❌ [S3] File key:", req.body?.file_key);
    res
      .status(500)
      .json({ error: "Failed to generate signed URL for viewing" });
  }
});

export default router;
