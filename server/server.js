// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config({ path: './config.env' });

// Verify environment variables are loaded
console.log('🔧 Environment Variables Loaded:');
console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import cookieParser from "cookie-parser";
// Check Google OAuth configuration before importing passport config
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in config.env');
} else {
  console.log('✅ Google OAuth configured');
}

import "./config/passport.js";

// Import routes - conditionally import MongoDB-dependent routes
let records, group_progress;
try {
  if (process.env.ATLAS_URI && (process.env.ATLAS_URI.startsWith('mongodb://') || process.env.ATLAS_URI.startsWith('mongodb+srv://'))) {
    records = (await import("./routes/records.js")).default;
    group_progress = (await import("./routes/group_progress.js")).default;
    console.log('✅ MongoDB routes loaded');
  } else {
    console.log('⚠️ MongoDB not configured, skipping MongoDB-dependent routes');
  }
} catch (error) {
  console.log('⚠️ Failed to load MongoDB routes:', error.message);
}
import groups from "./routes/groups.js";
import users from "./routes/users.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";

const PORT = process.env.PORT || 5050;
const app = express();

// Security middleware
app.use(helmet());

// ✅ Restrict CORS to your Angular app only
const allowedOrigins = [
  "http://localhost:4200",   // Angular local dev (default)
  "http://localhost:44740",  // Angular local dev (alternative port)
  "https://your-production-domain.com" // replace with your real prod domain
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "🚫 CORS error: This origin is not allowed.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
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
if (records) app.use("/records", records);
if (group_progress) app.use("/group_progress", group_progress);
app.use("/groups", groups);
app.use("/api/users", users);
app.use("/auth", auth);
app.use("/admin", admin);

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
app.get("/health", (req, res) => {
  // Debug: Log session info
  console.log('Session Debug:', {
    sessionID: req.sessionID,
    hasSession: !!req.session,
    sessionUser: req.session?.user,
    sessionData: req.session
  });
  
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessionID: req.sessionID
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log('🗄️ Database configuration: Supabase PostgreSQL');
  console.log('🔗 Ready to accept connections...');
});



//node --env-file=config.env server.js