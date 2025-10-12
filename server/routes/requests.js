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
import supabase from "../databaseConnections/Supabase/supabase_connection.js";



const router = express.Router();
const collection = db.collection("requests");
const recordsCollection = db.collection("records");

// Multer setup (for Admin/SuperAdmin PDF upload)
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------- Get All Requests from Supabase -------------------- */
router.get("/analytics", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("requesters_analytics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("❌ Error fetching requesters analytics:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

/* -------------------- Get Request Details (MongoDB + Records) -------------------- */
router.get("/:request_id/details", async (req, res) => {
  try {
    const { request_id } = req.params;

    // 1. Fetch request from MongoDB
    const request = await collection.findOne({ _id: new ObjectId(request_id) });
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // 2. Fetch document details from records collection
    let documentDetails = null;
    if (request.document_id) {
      documentDetails = await recordsCollection.findOne({ document_id: request.document_id });
    }

    // 3. Combine and return
    res.json({
      request: {
        _id: request._id,
        document_id: request.document_id,
        userType: request.userType,
        requester: request.requester,
        chaptersRequested: request.chaptersRequested,
        purpose: request.purpose,
        status: request.status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        deanRemarks: request.deanRemarks,
        approvedChapters: request.approvedChapters,
        s3Key: request.s3Key
      },
      document: documentDetails ? {
        _id: documentDetails._id,
        document_id: documentDetails.document_id,
        title: documentDetails.title,
        abstract: documentDetails.abstract,
        authors: documentDetails.authors,
        tags: documentDetails.tags,
        file_key: documentDetails.file_key,
        program_name: documentDetails.program_name,
        department: documentDetails.department,
        submitted_at: documentDetails.submitted_at,
        created_at: documentDetails.created_at
      } : null
    });
  } catch (err) {
    console.error("❌ Error fetching request details:", err);
    res.status(500).json({ error: "Failed to fetch request details" });
  }
});

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

/* -------------------- Reject Request -------------------- */
router.post("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await collection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Update MongoDB
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          deanRemarks: reason || "Request rejected",
          updatedAt: new Date(),
        },
      }
    );

    // Update Supabase analytics status
    updateRequestStatus(id, "rejected");

    // Send email via SES
    const subject = "Your document request has been rejected";
    const body = `<p>Your request for ${request.document_id} was rejected.</p>
                  <p>Reason: ${reason || "Not specified"}</p>`;

    await sendEmail(request.requester.email, subject, body);

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

export default router;
