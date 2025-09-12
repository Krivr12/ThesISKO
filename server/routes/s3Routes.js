import express from "express";
import multer from "multer";
import s3 from "../s3Bucket/s3.js"; 

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Student upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `submission/${req.file.originalname}`,
      Body: req.file.buffer,
    };

    const result = await s3.upload(params).promise();
    res.json({ message: "✅ File uploaded!", url: result.Location });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Upload failed" });
  }
});

// Faculty/Admin download
router.get("/download/:filename", async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `submission/${req.params.filename}`,
    };

    const file = await s3.getObject(params).promise();
    res.setHeader("Content-Disposition", `attachment; filename=${req.params.filename}`);
    res.send(file.Body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Download failed" });
  }
});

export default router;
