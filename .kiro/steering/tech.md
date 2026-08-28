# Technology Stack & Build System

## Tech Stack Overview

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5.1.0
- **Language**: JavaScript (ES modules)
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)
- **Authentication**: Passport.js with local strategy and Google OAuth 2.0
- **Password Hashing**: bcrypt 6.0.0
- **Input Validation**: validator 13.9.0

### Frontend
- **Framework**: Angular 20.1.0
- **Language**: TypeScript 5.8.2
- **UI Library**: PrimeNG 20.0.1 with Aura theme
- **Material Design**: Angular Material 20.1.5
- **Styling**: CSS + SCSS
- **Build Tool**: Angular CLI 20.1.3 (vite-based)
- **HTTP Client**: Angular HttpClient with custom interceptors
- **Reactive**: RxJS 7.8.0

### Databases
- **Primary**: MongoDB 6.18.0 (via MongoDB Node driver)
- **Secondary**: PostgreSQL 8.16.3 (for session storage)
- **ORM/Query**: Direct driver usage (no ORM abstraction)

### External Services
- **File Storage**: AWS S3 (@aws-sdk/client-s3, aws-sdk)
- **Presigned URLs**: @aws-sdk/s3-request-presigner
- **Email (Primary)**: Resend 6.1.2
- **Email (Fallback)**: Nodemailer 7.0.7
- **Webhooks**: Svix 1.84.1 (for Resend inbound email)
- **Backend Service**: Supabase (@supabase/supabase-js)

### ML/Embeddings
- **Transformers**: @xenova/transformers 2.17.2 (ONNX runtime for embeddings)

### Security & Middleware
- **Security Headers**: Helmet 8.1.0
- **CORS**: cors 2.8.5
- **Rate Limiting**: express-rate-limit 8.2.1
- **Cookie Parser**: cookie-parser 1.4.7
- **Multipart Forms**: multer 2.0.2
- **Caching**: node-cache 5.1.2

### Development Tools
- **Dev Server**: nodemon 3.1.10 (backend)
- **Monorepo Script**: concurrently 9.1.0 (run client + server together)

## Project Structure

```
ThesISKO/
├── client/                 # Angular frontend (SPA)
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/      # Admin dashboard module
│   │   │   ├── adminSide/  # Admin-specific components
│   │   │   ├── superAdmin/ # Super admin components
│   │   │   ├── facultySide/ # Faculty review interface
│   │   │   ├── components/ # Shared UI components
│   │   │   ├── service/    # HTTP services
│   │   │   ├── guards/     # Route guards (auth, role-based)
│   │   │   ├── interceptors/ # HTTP interceptors (auth token injection)
│   │   │   ├── interface/  # TypeScript interfaces/types
│   │   │   ├── shared/     # Shared utilities
│   │   │   ├── utils/      # Utility functions
│   │   │   ├── app.config.ts # Angular config with providers
│   │   │   ├── app.routes.ts # Route definitions
│   │   │   └── app.ts      # Root component
│   │   ├── environments/   # Environment configs (prod, dev)
│   │   ├── index.html      # Entry point (runtime config in script tag)
│   │   └── main.ts         # Bootstrap
│   ├── package.json
│   └── angular.json        # Angular CLI config
├── server/                 # Express backend (API)
│   ├── controller/         # Route handlers (auth, submissions, users, S3, etc.)
│   ├── routes/             # Route definitions (auth, submissions, admin, etc.)
│   ├── services/           # Business logic (email, analytics, cleanup, retry)
│   ├── middlewares/        # Express middlewares (auth, rate limit, validation, logging)
│   ├── databaseConnections/ # DB connection setup
│   │   ├── MongoDB/
│   │   ├── Supabase/
│   │   └── AWS/
│   ├── data/               # Database access layer
│   ├── config/             # Configuration (passport, mailer, S3 CORS)
│   ├── utils/              # Utilities (cookie config, password generation)
│   ├── templates/          # Email templates
│   ├── tests/              # Test files
│   ├── logs/               # Application logs
│   ├── server.js           # Express app setup and initialization
│   ├── app.js              # Middleware and route setup
│   ├── package.json
│   └── config.env          # Environment variables (git-ignored)
├── .kiro/                  # Kiro workspace config
│   └── steering/           # Steering guides
├── package.json            # Root monorepo config
├── API.md                  # API documentation
└── .gitignore
```

## Build & Run Commands

### Development

**Run Both Client & Server:**
```bash
npm run dev
```
This concurrently starts:
- Client: `npm run start --prefix client` (ng serve on http://localhost:4200)
- Server: `npm run dev --prefix server` (nodemon on http://localhost:5050 by default)

**Client Only:**
```bash
npm run start --prefix client
```
Angular dev server with hot reload on http://localhost:4200

**Server Only:**
```bash
npm run dev --prefix server
```
Nodemon watches for changes and restarts the Node.js server.

### Production Build

**Client Build:**
```bash
npm run build --prefix client
```
Creates optimized build in `client/dist/` (AoT compilation, tree-shaking, minification).

**Server Build:**
```bash
npm run build --prefix server
```
No build step required (ES modules run directly).

**Run Production Server:**
```bash
npm run start --prefix server
```
Starts server with environment variables loaded from `server/config.env`.

### Database & Setup

**Seed Document Types:**
```bash
npm run seed:document-types --prefix server
```
Populates MongoDB with initial document type records.

**Reset Password Utility:**
```bash
node reset-password.js --prefix server
```
Manual password reset tool.

**Test Email Sending:**
```bash
node test-email.js --prefix server
```
Verify email configuration (Resend/Nodemailer).

### Testing

**Run Tests:**
```bash
npm run test --prefix server
```
Note: Test suite is currently a placeholder ("Error: no test specified").

## Configuration

### Backend Environment Variables (`server/config.env`)
```
# Database
MONGODB_URI=mongodb://...
POSTGRES_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=thesis-bucket
AWS_REGION=us-east-1

# Email
RESEND_API_KEY=...
NODEMAILER_USER=...
NODEMAILER_PASSWORD=...

# Supabase
SUPABASE_URL=...
SUPABASE_KEY=...

# Server
PORT=5050
NODE_ENV=development
```

### Frontend Runtime Config (`client/src/index.html`)
```javascript
window.appConfig = {
  authApiUrl: 'http://localhost:5050',
  apiBaseUrl: 'http://localhost:5050',
  apiUrl: 'http://localhost:5050',
  recordsApiUrl: 'http://localhost:5050/records'
};
```

## Code Style & Conventions

### JavaScript/Node.js
- Use ES modules (import/export)
- Async/await for asynchronous operations
- Error handling with try-catch blocks
- Express middleware pattern for cross-cutting concerns

### TypeScript/Angular
- Strict null checking enabled
- Interfaces for data models
- Observables (RxJS) for async operations
- Services for business logic, Components for UI

### Naming Conventions
- Controllers: `*Controller.js`
- Services: `*Service.js`
- Routes: `*Routes.js` or `*.js` in routes directory
- Middlewares: `*Middleware.js`
- Angular components: `*.component.ts`, `*.component.html`, `*.component.css`

### Dependencies Management
- Package versions are pinned (no caret ranges)
- Monorepo structure with separate package.json for client and server
- Root package.json for shared dependencies and scripts

## Important Notes

- **Session Store**: Uses PostgreSQL (connect-pg-simple) for distributed session persistence
- **Authentication**: JWT tokens + session-based auth via Passport
- **File Uploads**: Multipart forms via multer, stored in AWS S3
- **API Base URL**: Configured at runtime in index.html (avoid hardcoding in code)
- **CORS**: Configured in Express for client origin
- **Rate Limiting**: Applied globally and specifically to auth endpoints
