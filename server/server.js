import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import "./config/passport.js";
import { activityLoggingMiddleware } from "./middleware/activityMiddleware.js";

// Import routes
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js";
import users from "./routes/users.js";
import auth from "./routes/auth.js";
import admin from "./routes/admin.js";
import activity from "./routes/activity.js";

const PORT = process.env.PORT || 5050;
const app = express();

// Security middleware
app.use(helmet());

// ✅ Restrict CORS to your Angular app only
const allowedOrigins = [
  "http://localhost:4200",   // Angular local dev
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

// Activity logging middleware (after session setup)
app.use(activityLoggingMiddleware);

// Routes
app.use("/records", records);
app.use("/group_progress", group_progress);
app.use("/api/users", users);
app.use("/auth", auth);
app.use("/admin", admin);
app.use("/activity", activity);

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
});



//node --env-file=config.env server.js