# ThesISKO

**ThesISKO** is a thesis and capstone submission and management system for academic institutions. It allows students to submit thesis/capstone documents, supports role-based workflows (Chairperson and Dean approvals), document storage and retrieval, and search over archived research.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Running Client and Server Separately](#running-client-and-server-separately)
- [Production Build](#production-build)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)

---

## Overview

ThesISKO provides:

- **Student portal**: Sign up, sign in (including Google OAuth), submit thesis/capstone with metadata and PDFs, and view thank-you/confirmation flows.
- **Admin (Chairperson / Dean) portal**: Approvals, rejections, document management, programs, requirements, templates, and requests.
- **Document lifecycle**: Submission → Chairperson approval → Dean approval → archival, with optional resubmission and file updates.
- **Search**: Vector/semantic search over approved documents (embeddings + MongoDB/S3).
- **Security**: Session-based auth, role-based access, rate limiting, CORS, and secure file access via signed S3 URLs.

---

## Features

| Area | Capabilities |
|------|--------------|
| **Auth** | Local + Google OAuth, session/cookie, role-based guards (student, chairperson, dean, superadmin) |
| **Submissions** | Multi-step form, document types & requirements, duplicate check, S3 uploads, year validation |
| **Approvals** | Chairperson and Dean approval/reject flows, resubmission with file selection |
| **Documents** | List, search by title, view/download PDFs, update metadata, archive status |
| **Admin** | Dashboard, documents, programs, requirements, templates, requests, approvals |
| **Search** | Full-text / vector search over thesis records |
| **Email** | Resend (and optional SMTP/Brevo) for verification, passwords, and notifications |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Angular 20, Angular Material, PrimeNG, standalone components, signals |
| **Backend** | Node.js, Express 5, ES modules |
| **Auth** | Passport (local + Google OAuth), express-session, cookie-based |
| **Databases** | MongoDB (Atlas) – submissions, records, embeddings; PostgreSQL (Supabase) – users, sessions |
| **Storage** | AWS S3 – thesis PDFs and repository files |
| **Email** | Resend (primary), optional Gmail/Brevo SMTP |
| **Deployment** | Vercel (client + server) |

---

## Project Structure

```
ThesISKO/
├── client/                 # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # Shared (login, signup, home, submission, etc.)
│   │   │   ├── adminSide/   # Admin UI (dashboard, documents, approvals, etc.)
│   │   │   ├── admin/       # Legacy admin modules
│   │   │   ├── superAdmin/  # Superadmin modules
│   │   │   ├── facultySide/ # Faculty-related (if used)
│   │   │   ├── guards/      # Route guards (auth, role)
│   │   │   ├── service/     # API and auth services
│   │   │   └── environments/
│   │   └── ...
│   ├── angular.json
│   └── package.json
├── server/                  # Express API
│   ├── config/              # Passport, mailer, email providers
│   ├── controller/          # Auth, embedding, S3, etc.
│   ├── routes/              # auth, records, submissions, s3, users, etc.
│   ├── middlewares/         # Auth, rate limit, cache, validation
│   ├── databaseConnections/ # MongoDB, S3, Supabase
│   ├── server.js
│   ├── config.env           # Server env vars (create from template, do not commit secrets)
│   └── package.json
├── package.json             # Root: single-command dev script
└── README.md                # This file
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **MongoDB** (Atlas or local) – connection URI
- **PostgreSQL** (e.g. Supabase) – for users/sessions
- **AWS** account – S3 buckets and IAM credentials for document storage
- **Google Cloud** – OAuth client ID/secret for “Sign in with Google” (optional)
- **Resend** (or SMTP) – for transactional email (optional but recommended)

---

## Environment Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd ThesISKO
npm install
npm install --prefix client
npm install --prefix server
```

### 2. Server environment (`server/config.env`)

The server loads environment variables from `server/config.env`. Create this file (or copy from a template) and set at least:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (e.g. `5050`) |
| `ATLAS_URI` | MongoDB connection string |
| `DATABASE_URL` or Supabase vars | PostgreSQL connection (Supabase pooler URL, etc.) |
| `SESSION_SECRET` | Secret for session and cookie signing (required in production) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | If using Supabase for users |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | AWS credentials for S3 |
| `THESISKO_DOCUMENTS_BUCKET`, `THESISKO_REPOSITORY_BUCKET` | S3 bucket names |
| `ALLOWED_ORIGINS` | Comma-separated origins (e.g. `http://localhost:4200`) |
| `FRONTEND_URL` | Frontend URL for redirects and emails |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | If using Google OAuth |
| `RESEND_API_KEY`, `RESEND_MAIL_FROM` | If using Resend for email |

Do not commit real secrets. Use `.env.example` or a secure secrets manager in production.

### 3. Client environment (optional)

For local development, the client uses `src/environments/environment.ts` (e.g. `apiUrl: 'http://localhost:5050'`). For production builds, `environment.prod.ts` is used. Adjust API base URLs if your server runs on a different host/port.

---

## Running the Application

From the **repository root**:

```bash
npm run dev
```

This single command:

1. Starts the **Angular dev server** (e.g. **http://localhost:4200**) with hot reload.
2. Starts the **Node API server** (e.g. **http://localhost:5050**) with nodemon.

You only need one terminal. Use **Ctrl+C** to stop both.

**First time:** Ensure `server/config.env` exists and dependencies are installed (see [Environment Setup](#environment-setup)).

---

## Running Client and Server Separately

Useful for debugging or running only one part:

**Terminal 1 – Frontend**

```bash
cd client
npm start
```

- App: **http://localhost:4200**

**Terminal 2 – Backend**

```bash
cd server
npm run dev
```

- API: **http://localhost:5050** (or the `PORT` in `config.env`)

Ensure the client’s environment points at the same API URL (e.g. `http://localhost:5050` in `client/src/environments/environment.ts`).

---

## Production Build

**Client (Angular)**

```bash
cd client
npm run build
```

Output is under `client/dist/ThesISKO/browser` (or as configured in `angular.json`).

**Server**

The server is Node/Express; no separate build step. Run it with:

```bash
cd server
npm start
```

(`npm start` uses `node --env-file config.env server.js`.)

---

## Deployment

- **Frontend**: Typically deployed to Vercel with `ng build --configuration production`. Build and output are configured in `client/vercel.json` (e.g. `buildCommand`, `outputDirectory`).
- **Backend**: Deployed as a Node server (e.g. Vercel serverless with `server/vercel.json` using `@vercel/node` for `server.js`).

The root `npm run dev` script is for **local development only** and is not used by Vercel. Deployment builds and commands are defined in each project’s Vercel config or dashboard.

---


## API Documentation

Complete API documentation is available in **[API.md](./API.md)**, including:

- Authentication endpoints (login, signup, logout)
- Submission management (create, read, update, delete)
- File upload and download
- Admin operations (approvals, rejections)
- Search and statistics
- Error responses and rate limits

Quick example:

```bash
# Login
curl -X POST http://localhost:5050/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get submissions (with JWT token)
curl http://localhost:5050/submissions/student/user@example.com \
  -H "Authorization: Bearer <your-jwt-token>"
```

See **[API.md](./API.md)** for complete endpoint documentation.

---

## Testing

Basic tests are available in `server/tests/`:

```bash
# Test database connections
node server/tests/database-connection.test.js

# Test S3 connection
node server/tests/s3-connection.test.js

# Test authentication (JWT)
node server/tests/auth.test.js

# Test email service
node server/test-email.js
```

All tests require proper environment variables in `server/config.env`.

See **[server/tests/README.md](./server/tests/README.md)** for detailed test documentation.

---
