import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "server/config.env" });

const app = express();

// ✅ Load allowed origins from env
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
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
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());

// Routes
app.use("/records", records);
app.use("/group_progress", group_progress);
app.use("/s3", s3Routes); 
app.use("/s3", s3SearchRoutes); 

// ❌ REMOVE app.listen()
// ✅ Export the app for Vercel
export default app;
