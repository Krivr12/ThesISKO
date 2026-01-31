import express from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import db from "../databaseConnections/MongoDB/mongodb_connection.js";
import s3 from "../databaseConnections/AWS/s3_connection.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadRequestersData, updateRequestStatus } from "../services/analyticsService.js";
import { validateRequest } from "../middlewares/requestValidator.js";
import rateLimiter from "../middlewares/rateLimiter.js";
import supabase from "../databaseConnections/Supabase/supabase_connection.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/authorizationMiddleware.js";

const router = express.Router();
const collection = db.collection("requests");
const recordsCollection = db.collection("records");

// Multer setup (for Admin/SuperAdmin PDF upload)
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------- Get All Requests from Supabase (admin only: role 3, 4, 5) -------------------- */
router.get("/analytics", requireAuth, requireRole(3, 4, 5), async (req, res) => {
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

/* -------------------- Get Request Details (admin only: role 3, 4, 5) -------------------- */
router.get("/:request_id/details", requireAuth, requireRole(3, 4, 5), async (req, res) => {
  try {
    const { request_id } = req.params;

    // 1. Fetch request from MongoDB
    const request = await collection.findOne({ _id: new ObjectId(request_id) });
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    console.log("📋 Request found:", {
      _id: request._id,
      document_id: request.document_id,
      status: request.status
    });

    // 2. Fetch document details from records collection
    let documentDetails = null;
    if (request.document_id) {
      console.log("🔍 Looking for document with document_id:", request.document_id);
      
      // Try to find by _id first (if document_id is actually a MongoDB ObjectId)
      if (ObjectId.isValid(request.document_id)) {
        console.log("🔍 Trying to find by _id (ObjectId)...");
        documentDetails = await recordsCollection.findOne({ _id: new ObjectId(request.document_id) });
      }
      
      // If not found, try by document_id string (like "2025-BSIT-0001")
      if (!documentDetails) {
        console.log("🔍 Trying to find by document_id string...");
        documentDetails = await recordsCollection.findOne({ document_id: request.document_id });
      }
      
      if (documentDetails) {
        console.log("✅ Document found:", documentDetails.document_id);
      } else {
        console.log("❌ No document found with document_id:", request.document_id);
      }
    } else {
      console.log("⚠️ Request has no document_id field");
    }

    // 3. Fetch requester data from Supabase (for backward compatibility, also check MongoDB)
    let requesterData = null;
    try {
      const { data, error } = await supabase
        .from("requesters_analytics")
        .select("*")
        .eq("request_id", request_id)
        .single();
      
      if (!error && data) {
        requesterData = {
          email: data.email,
          program: data.program,
          department: data.department,
          role: data.role,
          fullName: data.full_name,
          city: data.city,
          country: data.country,
          school: data.school,
          supervisor: data.supervisor,
          contact_number: data.contact_number
        };
      }
    } catch (err) {
      console.error("⚠️ Error fetching requester data from Supabase:", err);
    }

    // 3. Combine and return
    res.json({
      request: {
        _id: request._id,
        document_id: request.document_id,
        user_type: request.user_type || request.userType, // Support both old and new field names
        requester: requesterData, // From Supabase table
        chaptersRequested: request.chaptersRequested,
        purpose: request.purpose,
        intendedUse: request.intendedUse,
        howDidYouLearn: request.howDidYouLearn,
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
        files: documentDetails.files || [],
        program_name: documentDetails.program_name,
        department: documentDetails.department,
        year: documentDetails.year,
        document_status: documentDetails.document_status,
        submitted_at: documentDetails.submitted_at,
        created_at: documentDetails.created_at
      } : null
    });
  } catch (err) {
    console.error("❌ Error fetching request details:", err);
    res.status(500).json({ error: "Failed to fetch request details" });
  }
});

/* -------------------- Create Request (authenticated users only; roles 1, 2, 6 can request) -------------------- */
router.post("/", requireAuth, rateLimiter, validateRequest, async (req, res) => {
  try {
    // Extract MongoDB-only fields (long texts and arrays)
    const { 
      document_id, 
      user_type, 
      chaptersRequested, 
      purpose,
      // Old document specific long text fields
      intendedUse,
      howDidYouLearn
    } = req.body;

    // Build MongoDB document (only long texts, arrays, and user_type)
    const newRequest = {
      document_id,
      user_type, // Only redundant field allowed
      chaptersRequested,
      purpose,
    };

    // Add old document specific long text fields if present
    if (intendedUse !== undefined) {
      newRequest.intendedUse = intendedUse;
    }
    if (howDidYouLearn !== undefined) {
      newRequest.howDidYouLearn = howDidYouLearn;
    }

    const result = await collection.insertOne(newRequest);

    // Extract structured data for PostgreSQL table (everything except MongoDB fields)
    const structuredData = {
      user_type: req.body.user_type,
      email: req.body.email,
      program: req.body.program || null,
      department: req.body.department || null,
      role: req.body.role || null,
      full_name: req.body.full_name || null,
      city: req.body.city || null,
      country: req.body.country || null,
      school: req.body.school || null,
      supervisor: req.body.supervisor || null,
      contact_number: req.body.contact_number || null,
      consent_to_contact: req.body.consent_to_contact || null,
      preferred_contact_method: req.body.preferred_contact_method || null
    };

    // 🔹 Send analytics copy to Supabase
    uploadRequestersData(structuredData, result.insertedId.toString());

    res
      .status(201)
      .json({ message: "Request submitted", requestId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

/* -------------------- Dean Respond (Approve/Reject) - admin only -------------------- */
router.post("/:id/respond", requireAuth, requireRole(3, 4, 5), upload.single("pdf"), async (req, res) => {
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

    console.log("✅ MongoDB updated for request:", id);

    // 🔹 Update Supabase analytics status as well
    updateRequestStatus(id, status);

    console.log("✅ Supabase analytics updated");

    // Fetch email from Supabase table
    const { data: requesterData, error: supabaseError } = await supabase
      .from("requesters_analytics")
      .select("email")
      .eq("request_id", id)
      .single();

    if (supabaseError || !requesterData) {
      console.error("❌ Error fetching email from Supabase:", supabaseError);
      return res.status(500).json({ error: "Failed to fetch requester email" });
    }

    // Send email via unified email service
    const { sendEmail: unifiedSendEmail } = await import('../services/emailService.js');
    
    const subject =
      status === "approved"
        ? "Your document request has been approved"
        : "Your document request has been rejected";
    
    const expiryTime = status === "approved" ? "2 days" : "";

    console.log("📧 Sending email to:", requesterData.email);
    
    await unifiedSendEmail({
      to: requesterData.email,
      subject: subject,
      template: 'requestApproval',
      data: {
        headerIcon: status === "approved" ? '✅' : '❌',
        headerTitle: status === "approved" ? 'Request Approved' : 'Request Rejected',
        status: status,
        statusText: status === "approved" ? 'APPROVED' : 'REJECTED',
        statusIcon: status === "approved" ? '✅' : '❌',
        statusColor: status === "approved" ? '#4caf50' : '#f44336',
        documentId: request.document_id,
        remarks: deanRemarks || (status === "approved" ? "Your request has been approved." : "Your request has been rejected."),
        remarksLabel: status === "approved" ? 'Dean\'s Remarks' : 'Rejection Reason',
        remarksBackground: status === "approved" ? '#e8f5e9' : '#ffebee',
        remarksBorder: status === "approved" ? '#c8e6c9' : '#ffcdd2',
        remarksColor: status === "approved" ? '#2e7d32' : '#c62828',
        approvedChapters: status === "approved" ? approvedChapters : null,
        downloadUrl: status === "approved" ? presignedUrl : null,
        expiryTime: expiryTime,
        isRejected: status !== "approved"
      }
    });
    
    console.log("✅ Email sent successfully via unified service");

    res.json({ message: `Request ${status}`, presignedUrl });
  } catch (err) {
    console.error("❌ Error in /respond route:", err);
    console.error("❌ Error details:", {
      message: err.message,
      stack: err.stack,
      requestId: req.params.id
    });
    res.status(500).json({ error: "Failed to respond to request", details: err.message });
  }
});

/* -------------------- Reject Request (admin only) -------------------- */
router.post("/:id/reject", requireAuth, requireRole(3, 4, 5), async (req, res) => {
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

    // Fetch email from Supabase table
    const { data: requesterData, error: supabaseError } = await supabase
      .from("requesters_analytics")
      .select("email")
      .eq("request_id", id)
      .single();

    if (supabaseError || !requesterData) {
      console.error("❌ Error fetching email from Supabase:", supabaseError);
      return res.status(500).json({ error: "Failed to fetch requester email" });
    }

    // Send email via unified email service
    const { sendEmail: unifiedSendEmail } = await import('../services/emailService.js');

    await unifiedSendEmail({
      to: requesterData.email,
      subject: "Your document request has been rejected",
      template: 'requestApproval',
      data: {
        headerIcon: '❌',
        headerTitle: 'Request Rejected',
        status: 'rejected',
        statusText: 'REJECTED',
        statusIcon: '❌',
        statusColor: '#f44336',
        documentId: request.document_id,
        remarks: reason || "Not specified",
        remarksLabel: 'Rejection Reason',
        remarksBackground: '#ffebee',
        remarksBorder: '#ffcdd2',
        remarksColor: '#c62828',
        isRejected: true
      }
    });

    res.json({ message: "Request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

export default router;
