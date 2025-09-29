import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js"
import s3Routes from "./routes/s3Routes.js"; // import S3 routes
import s3SearchRoutes from "./routes/s3Search.js"; // import separate search route
import blocks from "./routes/blocks.js"
import groups from "./routes/groups.js"
import programs from "./routes/programs.js"
import requests from "./routes/requests.js"

dotenv.config({ path: "config.env" });

const app = express();

// ✅ Load allowed origins from env
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // ✅ Added OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // ✅ Added credentials support
  })
);

// ✅ Add explicit OPTIONS handler
app.options('*', cors());

app.use(express.json());

// Routes
app.use("/records", records);
app.use("/programs", programs);
app.use("/group_progress", group_progress);
app.use("/s3", s3Routes);
app.use("/s3", s3SearchRoutes);
app.use("/blocks", blocks);
app.use("/groups", groups);
app.use("/requests", requests)

// ❌ REMOVE app.listen()
// ✅ Export the app for Vercel
export default app;