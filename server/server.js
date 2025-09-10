import express from "express";
import cors from "cors";
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js"

const PORT = process.env.PORT || 5050;
const app = express();

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
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/records", records);
app.use("/group_progress", group_progress);

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});



//node --env-file=config.env server.js