import express from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import db from "../databaseConnections/MongoDB/mongodb_connection.js";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import { sendEmail } from "../services/sesService.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadRequestersData, updateRequestStatus } from "../services/analyticsService.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import rateLimiter from "../middlewares/rateLimiter.js";



const router = express.Router();
const collection = db.collection("requests");

// Multer setup (for Dean’s PDF upload)
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------- Create Request (Student/Guest) -------------------- */
router.post("/", rateLimiter, validateRequest, async (req, res) => {
  try {
    const { document_id, userType, requester, chaptersRequested, purpose } = req.body;

    const newRequest = {
      document_id,
      userType,
      requester, // must contain at least { email }
      chaptersRequested,
      purpose,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newRequest);

    // 🔹 Send analytics copy to Supabase
    uploadRequestersData(requester, userType, result.insertedId.toString());

    res
      .status(201)
      .json({ message: "Request submitted", requestId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

/* -------------------- Dean Respond (Approve/Reject) -------------------- */
router.post("/:id/respond", upload.single("pdf"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deanRemarks, approvedChapters } = req.body;

    const request = await collection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ error: "Request not found" });

    let presignedUrl = null;
    let s3Key = null;

    if (status === "approved" && req.file) {
      // Upload dean’s approved PDF to S3
      s3Key = `requested-files/approved-requests/${id}-${Date.now()}.pdf`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
          Key: s3Key,
          Body: req.file.buffer,
          ContentType: "application/pdf",
        })
      );

      // Generate presigned URL for secure temporary access
      presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.THESISKO_DOCUMENTS_BUCKET,
          Key: s3Key,
        }),
        { expiresIn: 172800 } // 2 days
      );
    }

    // Update MongoDB
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          deanRemarks,
          approvedChapters,
          s3Key, // store key, not presigned url
          updatedAt: new Date(),
        },
      }
    );

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          deanRemarks,
          approvedChapters,
          s3Key, // store key, not presigned url
          updatedAt: new Date(),
        },
      }
    );

    // 🔹 Update Supabase analytics status as well
    updateRequestStatus(id, status);

    // Send email via SES
    const subject =
      status === "approved"
        ? "Your document request has been approved"
        : "Your document request has been rejected";

    const body =
      status === "approved"
        ? `<p>Your request for ${request.document_id} was approved.</p>
           <p>Remarks: ${deanRemarks}</p>
           <p>You can download the file here (valid for 2 days): 
              <a href="${presignedUrl}">${presignedUrl}</a></p>`
        : `<p>Your request for ${request.document_id} was rejected.</p>
           <p>Reason: ${deanRemarks}</p>`;

    await sendEmail(request.requester.email, subject, body);

    res.json({ message: `Request ${status}`, presignedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to respond to request" });
  }
});

export default router;
