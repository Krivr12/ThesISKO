import express from "express";
import cors from "cors";
import records from "./routes/records.js";
import group_progress from "./routes/group_progress.js"
import s3Routes from "./routes/s3Routes.js"; // import S3 routes
import s3SearchRoutes from "./routes/s3Search.js"; // import separate search route
import dotenv from "dotenv";

const PORT = process.env.PORT || 5050;
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



app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
//node --env-file=config.env server.js    
// ❌ REMOVE app.listen()
// ✅ Export the app for Vercel
export default app;

