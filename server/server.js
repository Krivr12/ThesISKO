// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config.env from the same directory as server.js
dotenv.config({ path: join(__dirname, 'config.env') });

// Verify environment variables are loaded
// Environment variables loaded from config.env

import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import "./config/passport.js"; // Import passport configuration
import helmet from "helmet";
import cookieParser from "cookie-parser";
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js"
import s3Routes from "./routes/s3Routes.js"; // import S3 routes
import s3SearchRoutes from "./routes/s3Search.js"; // import separate search route
import users from "./routes/users.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import facultyPassword from "./routes/faculty-password.js";

const PORT = process.env.PORT || 5050;
const app = express();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately, log and continue
  console.log('🔄 Server continuing despite uncaught exception...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, log and continue
  console.log('🔄 Server continuing despite unhandled rejection...');
});

// Security middleware
app.use(helmet());

// ✅ Restrict CORS to your Angular app only
const allowedOrigins = [
  "http://localhost:4200",   // Angular local dev (default)
  "http://localhost:4201",   // Angular local dev (alternative port)
  "http://127.0.0.1:4201",   // Alternative localhost format
  "http://localhost:54825",  // Angular dev server dynamic port
  "http://localhost:44740",  // Angular local dev (alternative port)
  "https://thesisko.vercel.app" // replace with your real prod domain
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Debug - Origin received:', origin);
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port (more flexible for Angular dev server)
    if (/^http:\/\/localhost:\d{1,5}$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origin)) {
      return callback(null, true);
    }
    
    // Allow production domain
    if (origin === 'https://thesisko.vercel.app') {
      return callback(null, true);
    }
    
    const msg = `🚫 CORS error: This origin '${origin}' is not allowed.`;
    console.error(msg);
    return callback(new Error(msg), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/records", records);
app.use("/group_progress", group_progress);
app.use("/s3", s3Routes); // Routes which includes Upload/Upload-multiple/Delete/View
app.use("/s3", s3SearchRoutes); // Routes for search
app.use("/api/users", users);
app.use("/auth", auth);
app.use("/admin", admin);
app.use("/api/faculty", facultyPassword);

// Direct verification route (for email links)
app.get("/verify-student", async (req, res) => {
  try {
    const { verifyStudentEmail } = await import('./controller/userController.js');
    await verifyStudentEmail(req, res);
  } catch (error) {
    console.error('Error importing verifyStudentEmail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    const pool = (await import('./data/database.js')).default;
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessionID: req.sessionID,
      database: "Connected"
    });
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessionID: req.sessionID,
      database: "Disconnected",
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Server running locally on port ${PORT}`);
    console.log('🗄️ Database configuration: Supabase PostgreSQL');
    console.log('🔗 Ready to accept connections...');
  });
}

// ✅ Export handler for Vercel
export default app;

//node --env-file=config.env server.js            
