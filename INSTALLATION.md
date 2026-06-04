# ThesISKO Installation Guide

This guide will walk you through setting up ThesISKO for development or production use.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Installation](#step-by-step-installation)
- [Database Setup](#database-setup)
- [AWS S3 Setup](#aws-s3-setup)
- [Email Configuration](#email-configuration)
- [Google OAuth Setup (Optional)](#google-oauth-setup-optional)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **MongoDB Atlas account** (Free tier available at [mongodb.com](https://www.mongodb.com/cloud/atlas))
- **Supabase account** (Free tier available at [supabase.com](https://supabase.com/))
- **AWS account** (For S3 storage - [aws.amazon.com](https://aws.amazon.com/))

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ThesISKO.git
cd ThesISKO
```

### 2. Install Dependencies

Install dependencies for the root, client, and server:

```bash
# Root dependencies (for concurrent dev script)
npm install

# Client dependencies (Angular)
npm install --prefix client

# Server dependencies (Express)
npm install --prefix server
```

### 3. Configure Server Environment

Copy the example configuration file:

```bash
cd server
copy config.env.example config.env
# On Mac/Linux: cp config.env.example config.env
```

Edit `server/config.env` with your actual credentials (see sections below).

---

## Database Setup

### MongoDB Atlas Setup

1. **Create a MongoDB Atlas account** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a new cluster** (Free M0 tier is sufficient for development)
3. **Create a database user**:
   - Go to Database Access
   - Add New Database User
   - Choose password authentication
   - Save username and password
4. **Whitelist your IP**:
   - Go to Network Access
   - Add IP Address
   - For development: Allow Access from Anywhere (0.0.0.0/0)
   - For production: Add specific IPs
5. **Get connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add to `config.env` as `ATLAS_URI`

Example:
```env
ATLAS_URI=mongodb+srv://thesisko_user:your_password@cluster0.xxxxx.mongodb.net/thesisko?retryWrites=true&w=majority
```

### Supabase PostgreSQL Setup

1. **Create a Supabase account** at [supabase.com](https://supabase.com/)
2. **Create a new project**
3. **Get your credentials**:
   - Go to Project Settings → API
   - Copy the Project URL (SUPABASE_URL)
   - Copy the service_role key (SUPABASE_SERVICE_ROLE_KEY)
   - Go to Project Settings → Database
   - Copy the Connection string (DATABASE_URL)
   - Use the "Pooler" connection string for better performance

Add to `config.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Run database migrations** (if provided in project):
   ```bash
   # Run SQL scripts in Supabase SQL Editor
   # Location: server/sql/schema.sql (if exists)
   ```

---

## AWS S3 Setup

### 1. Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create new user with programmatic access
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Save Access Key ID and Secret Access Key

### 2. Create S3 Buckets

1. Go to [S3 Console](https://s3.console.aws.amazon.com/)
2. Create two buckets:
   - `thesisko-documents-[your-suffix]` (for thesis PDFs)
   - `thesisko-repository-[your-suffix]` (for repository files)
3. Configure CORS on both buckets:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:4200", "https://your-production-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

4. **Block public access**: Keep enabled (use signed URLs instead)

### 3. Update config.env

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
THESISKO_DOCUMENTS_BUCKET=thesisko-documents-your-suffix
THESISKO_REPOSITORY_BUCKET=thesisko-repository-your-suffix
```

---

## Email Configuration

### Option 1: Resend (Recommended)

1. Create account at [resend.com](https://resend.com/)
2. Get API key from dashboard
3. Verify your domain (or use sandbox for testing)

```env
RESEND_API_KEY=re_123456789abcdefghijklmnop
RESEND_MAIL_FROM=noreply@yourdomain.com
```

### Option 2: Gmail SMTP

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_char_app_password
```

---

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5050/auth/google/callback`

```env
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_CALLBACK_URL=http://localhost:5050/auth/google/callback
```

---

## Session Configuration

Generate a secure session secret (at least 32 characters):

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
SESSION_SECRET=your_generated_secret_here_minimum_32_characters
```

---

## Frontend Configuration

Update `server/config.env`:

```env
PORT=5050
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:5050
```

For production, update `client/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com'
};
```

---

## Running the Application

From the project root:

```bash
npm run dev
```

This starts:
- **Client**: http://localhost:4200
- **Server**: http://localhost:5050

Or run separately:

```bash
# Terminal 1 - Client
cd client
npm start

# Terminal 2 - Server
cd server
npm run dev
```

---

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4200 | xargs kill -9
```

### MongoDB Connection Error

- Check if IP is whitelisted in MongoDB Atlas
- Verify connection string format
- Ensure password doesn't contain special characters (URL encode if needed)

### CORS Errors

- Ensure `ALLOWED_ORIGINS` includes your frontend URL
- Check that both URLs match exactly (with/without trailing slash)

### AWS S3 Upload Errors

- Verify IAM user has S3 permissions
- Check bucket names are correct
- Ensure CORS is configured on buckets

### Email Not Sending

- For Gmail: Use App Password, not account password
- For Resend: Verify domain ownership
- Check spam folder

---

## Next Steps

- Review [README.md](./README.md) for project overview
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Read [API Documentation](./docs/API.md) (if available)

---

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/your-username/ThesISKO/issues)
- Review project documentation
- Contact project maintainers

---

**Note**: Never commit `config.env` or any file containing credentials to version control!
