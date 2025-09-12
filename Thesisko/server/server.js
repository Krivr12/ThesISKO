import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import passport from './config/passport.js'
import { connectDB } from './data/database.js'
import helmet from 'helmet'
import cors from 'cors'
import { transporter } from './config/mailer.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/auth.js'
import records from "./routes/records.js"

const app = express()
const PORT = process.env.PORT || 3000

// Connect to database
connectDB()

// Mailer is initialized in mailer.js and verified on import

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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  app.use(helmet({ contentSecurityPolicy: false }))
} else {
  app.use(helmet({ contentSecurityPolicy: false, hsts: false }))
}

// Sessions (required for Passport to maintain login state)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
}))

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize())
app.use(passport.session())

// Routers
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)
app.use("/records", records)
// Keep verify-student at root for compatibility
app.use('/', usersRouter)

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})


//node --env-file=config.env server.js