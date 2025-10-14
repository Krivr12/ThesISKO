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
import rateLimiter from "./middlewares/rateLimiter.js";
import { validateRequest } from "./middlewares/requestValidator.js";
import { errorLoggerMiddleware } from "./middlewares/errorLogger.js";

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

// 🧾 Request validation only for request creation routes
app.use("/requests", validateRequest, requests);

// 🪵 Error logger middleware (must be last)
app.use(errorLoggerMiddleware);

export default app;
