import express from "express";
import multer from "multer";
import s3  from "../s3Bucket/s3.js"; // make sure s3 is exported as { s3 } in s3.js
import { DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// Student upload route
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `submission/${req.file.originalname}`,
      Body: req.file.buffer,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command); // v3 uses send() instead of .upload()

    // Construct the file URL (optional, same as in view route)
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/submission/${req.file.originalname}`;

    res.json({ message: "✅ File uploaded!", url: fileUrl });
  } catch (err) {
    console.error("S3 upload error:", err);
    res.status(500).json({ error: "❌ Upload failed" });
  }
});

// Student Delete route
router.delete("/delete/:filename", async (req, res) => {
  try {
    const key = `submission/${req.params.filename}`;

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }));

    res.json({ message: `✅ File ${req.params.filename} deleted successfully` });
  } catch (err) {
    console.error("❌ Delete failed", err);
    res.status(500).json({ error: "❌ Delete failed" });
  }
});


// Student Multiple-file upload route
router.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  try {
    const uploadedFiles = [];

    for (const file of req.files) {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `submission/${file.originalname}`,
        Body: file.buffer,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/submission/${file.originalname}`;
      uploadedFiles.push({ filename: file.originalname, url: fileUrl });

      

    }

    res.json({ message: "✅ Files uploaded!", files: uploadedFiles });
  } catch (err) {
    console.error("S3 multiple upload error:", err);
    res.status(500).json({ error: "❌ Upload failed" });
  }
});

// Faculty/Admin view file (signed URL for frontend)
router.get("/view/:filename", async (req, res) => {
  try {
    const key = `submission/${req.params.filename}`;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    // Generate signed URL valid for 1 hour
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({ url }); // send URL to Angular frontend
  } catch (err) {
    console.error("S3 get file error:", err);
    res.status(500).json({ error: "❌ Could not get file" });
  }
});


export default router;
