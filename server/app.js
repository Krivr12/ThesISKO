import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js";
import s3Routes from "./routes/s3Routes.js";
import s3SearchRoutes from "./routes/s3Search.js";
import blocks from "./routes/blocks.js";
import groups from "./routes/groups.js";
import programs from "./routes/programs.js";
import requests from "./routes/requests.js";
import documentTypes from "./routes/document-types.js";
import requirements from "./routes/requirements.js";
import submissions from "./routes/submissions.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import { validateRequest } from "./middlewares/requestValidator.js";
import { errorLoggerMiddleware } from "./middlewares/errorLogger.js";
import cron from "node-cron";
import { 
  checkAndUpdateDocumentStatus,
  checkAndTransitionOldDocuments, 
  restoreActiveDocuments 
} from "./services/glacierService.js";

dotenv.config({ path: "config.env" });

const app = express();

// ✅ Allowed CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "🚫 CORS error: This origin is not allowed.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// 🛡️ Global rate limiter (applies to all routes)
app.use(rateLimiter);

// Routes
app.use("/records", records);
app.use("/programs", programs);
app.use("/group_progress", group_progress);
app.use("/s3", s3Routes);
app.use("/s3", s3SearchRoutes);
app.use("/blocks", blocks);
app.use("/groups", groups);
app.use("/document-types", documentTypes);
app.use("/requirements", requirements);
app.use("/submissions", submissions);

// 🧾 Request validation only for request creation routes
app.use("/requests", validateRequest, requests);

// 🪵 Error logger middleware (must be last)
app.use(errorLoggerMiddleware);

// 🧊 Glacier transition cron job - Run weekly on Sunday at 2 AM
cron.schedule("0 2 * * 0", async () => {
  console.log("\n⏰ Weekly Glacier transition check triggered");
  try {
    // Step 1: First, update document_status for documents that have become 5 years old
    await checkAndUpdateDocumentStatus();
    
    // Step 2: Then, check and transition old documents to Glacier
    await checkAndTransitionOldDocuments();
    
    // Step 3: Check and restore active documents from Glacier
    await restoreActiveDocuments();
    
    console.log("✅ Weekly Glacier transition check completed");
  } catch (error) {
    console.error("❌ Weekly Glacier transition check failed:", error);
  }
});

// Log that cron job is set up
console.log("🧊 Glacier transition cron job scheduled: Weekly on Sunday at 2:00 AM");
console.log("   - Step 1: Update document_status for aged documents");
console.log("   - Step 2: Transition old documents to Glacier");
console.log("   - Step 3: Restore active documents from Glacier");

export default app;
