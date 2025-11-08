// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config.env from the same directory as server.js
dotenv.config({ path: join(__dirname, "config.env") });

// Verify environment variables are loaded
console.log("✅ Environment variables loaded from config.env");

import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import "./config/passport.js"; // Import passport configuration
import helmet from "helmet";
import cookieParser from "cookie-parser";

// Import routes
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js";
import s3Routes from "./routes/s3Routes.js";
import s3SearchRoutes from "./routes/s3Search.js";
import users from "./routes/users.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import facultyPassword from "./routes/faculty-password.js";
import requests from "./routes/requests.js";
import programs from "./routes/programs.js";
import groups from "./routes/groups.js";
import blocks from "./routes/blocks.js";
import analytics from "./routes/analytics.js";
import documentTypes from "./routes/document-types.js";
import requirements from "./routes/requirements.js";
import submissions from "./routes/submissions.js";
import contact from "./routes/contact.js";
import { preloadModel } from "./controller/embeddingService.js";
preloadModel();


const PORT = process.env.PORT || 5050;
const app = express();

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.log("🔄 Server continuing despite uncaught exception...");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  console.log("🔄 Server continuing despite unhandled rejection...");
});

// Security middleware
app.use(helmet());

// ✅ Dynamic CORS setup using ALLOWED_ORIGINS from config.env
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

console.log("🌐 Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("🔍 CORS Debug - Origin received:", origin);

      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin) return callback(null, true);

      // Allow any localhost or 127.0.0.1 port for flexibility in dev
      if (
        /^http:\/\/localhost:\d{1,5}$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Allow origins defined in config.env
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const msg = `🚫 CORS error: This origin '${origin}' is not allowed.`;
      console.error(msg);
      return callback(new Error(msg), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/records", records);
app.use("/group_progress", group_progress);
app.use("/s3", s3Routes);
app.use("/s3", s3SearchRoutes);
app.use("/api/users", users);
app.use("/auth", auth);
app.use("/admin", admin);
app.use("/api/faculty", facultyPassword);
app.use("/requests", requests);
app.use("/programs", programs);
app.use("/groups", groups);
app.use("/blocks", blocks);
app.use("/analytics", analytics);
app.use("/document-types", documentTypes);
app.use("/requirements", requirements);
app.use("/submissions", submissions);
app.use("/contact", contact);

// Direct verification route (for email links)
app.get("/verify-student", async (req, res) => {
  try {
    const { verifyStudentEmail } = await import("./controller/userController.js");
    await verifyStudentEmail(req, res);
  } catch (error) {
    console.error("Error importing verifyStudentEmail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const pool = (await import("./data/database.js")).default;
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessionID: req.sessionID,
      database: "Connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessionID: req.sessionID,
      database: "Disconnected",
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server (works for both local and Render)
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log("🗄️ Database configuration: Supabase PostgreSQL");
  console.log("🔗 Ready to accept connections...");
});

// Export app for compatibility
export default app;
