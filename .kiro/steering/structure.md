# Project Structure & Organization

## Directory Hierarchy

```
ThesISKO/
├── .git/                           # Git repository
├── .github/                        # GitHub workflows and actions
├── .kiro/                          # Kiro AI workspace configuration
│   └── steering/                   # Steering guides and conventions
│       ├── product.md              # Product overview
│       ├── tech.md                 # Tech stack and build commands
│       └── structure.md            # This file
├── .vscode/                        # VS Code workspace settings
├── .gitignore                      # Git ignore rules
├── API.md                          # REST API documentation
├── SESSION_REGENERATION_*.md       # Session management audit docs
├── SECURITY_AUDIT_FINDINGS.md      # Security audit report
├── package.json                    # Root monorepo config (concurrently, shared deps)
│
├── client/                         # Angular frontend application
│   ├── .angular/                   # Angular build cache (git-ignored)
│   ├── dist/                       # Production build output (git-ignored)
│   ├── node_modules/               # Dependencies (git-ignored)
│   ├── src/
│   │   ├── app/                    # Angular application code
│   │   │   ├── admin/              # Admin dashboard module
│   │   │   ├── adminSide/          # Admin-specific components
│   │   │   ├── superAdmin/         # Super admin management components
│   │   │   ├── facultySide/        # Faculty review interface
│   │   │   ├── components/         # Reusable shared UI components
│   │   │   ├── service/            # HTTP services (API communication)
│   │   │   ├── guards/             # Route guards (AuthGuard, RoleGuard)
│   │   │   ├── interceptors/       # HTTP interceptors (auth token injection)
│   │   │   ├── interface/          # TypeScript interfaces and types
│   │   │   ├── shared/             # Shared utilities and helper functions
│   │   │   ├── utils/              # Utility functions
│   │   │   ├── app.config.ts       # Angular providers configuration
│   │   │   ├── app.routes.ts       # Route definitions and lazy loading
│   │   │   ├── app.ts              # Root component
│   │   │   └── app.html            # Root template
│   │   ├── environments/           # Environment-specific configs
│   │   │   ├── environment.ts      # Development environment
│   │   │   └── environment.prod.ts # Production environment
│   │   ├── custom-theme.scss       # Custom SCSS theme overrides
│   │   ├── styles.css              # Global styles
│   │   ├── index.html              # HTML entry point (with runtime config)
│   │   ├── main.ts                 # Angular bootstrap
│   │   ├── .editorconfig           # EditorConfig settings
│   │   └── logo.png                # Application logo
│   ├── angular.json                # Angular CLI configuration
│   ├── package.json                # Client dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   └── package-lock.json           # Locked dependency versions
│
└── server/                         # Express.js backend API
    ├── node_modules/               # Dependencies (git-ignored)
    ├── logs/                       # Application logs (git-ignored)
    │   └── error.log               # Error log file
    ├── config/                     # Configuration modules
    │   ├── email-providers.js      # Email provider setup
    │   ├── mailer.js               # Mailer configuration
    │   ├── passport.js             # Passport authentication strategies
    │   └── s3-cors-config.json     # AWS S3 CORS configuration
    ├── controller/                 # Route handler logic
    │   ├── authController.js       # Authentication handlers (login, signup, etc.)
    │   ├── userController.js       # User CRUD operations
    │   ├── s3Controller.js         # S3 file upload/download handlers
    │   ├── embeddingService.js     # AI embedding generation
    │   ├── groupController.js      # Group management handlers
    │   └── contactController.js    # Contact form handlers
    ├── routes/                     # Express route definitions
    │   ├── auth.js                 # Authentication routes (/auth/*)
    │   ├── submissions.js          # Submission routes (/submissions/*)
    │   ├── users.js                # User routes (/users/*)
    │   ├── admin.js                # Admin routes (/admin/*)
    │   ├── document-types.js       # Document type routes
    │   ├── requirements.js         # Requirements routes
    │   ├── templates.js            # Template routes
    │   ├── s3Routes.js             # S3 file operation routes
    │   ├── s3Search.js             # S3 search/retrieval routes
    │   ├── groups.js               # Group management routes
    │   ├── records.js              # Records routes
    │   ├── analytics.js            # Analytics routes
    │   ├── webhooks.js             # Webhook routes (Resend, Svix)
    │   ├── contact.js              # Contact routes
    │   ├── requests.js             # Request handling routes
    │   ├── blocks.js               # Blocks/content routes
    │   ├── group_progress.js       # Group progress tracking
    │   └── programs.js             # Program management
    ├── services/                   # Business logic and services
    │   ├── emailService.js         # Email sending (Resend/Nodemailer)
    │   ├── analyticsService.js     # Analytics computation
    │   ├── cleanupService.js       # Cleanup and maintenance tasks
    │   ├── glacierService.js       # AWS Glacier archival service
    │   └── retryService.js         # Retry logic for failed operations
    ├── middlewares/                # Express middleware
    │   ├── authMiddleware.js       # JWT/Session verification
    │   ├── authorizationMiddleware.js # Role-based access control
    │   ├── authRateLimiter.js      # Rate limiter for auth endpoints
    │   ├── rateLimiter.js          # General rate limiter
    │   ├── requestValidator.js     # Request validation
    │   ├── errorLogger.js          # Error logging middleware
    │   └── cache.js                # Caching middleware
    ├── databaseConnections/        # Database connection setup
    │   ├── MongoDB/
    │   │   └── mongodb_connection.js # MongoDB client setup
    │   ├── Supabase/
    │   │   └── [supabase files]    # Supabase connection
    │   └── AWS/
    │       └── [AWS connection files] # AWS SDK configuration
    ├── data/                       # Data access layer
    │   └── database.js             # Database query utilities
    ├── utils/                      # Utility functions
    │   ├── cookieConfig.js         # Cookie configuration
    │   └── passwordGenerator.js    # Secure password generation
    ├── templates/                  # Email templates
    │   └── email/                  # Email template files
    │       ├── [template files]    # HTML email templates
    ├── tests/                      # Test files
    │   ├── auth.test.js            # Authentication tests
    │   ├── database-connection.test.js # Database connection tests
    │   ├── s3-connection.test.js   # S3 connection tests
    │   ├── session.test.js         # Session handling tests
    │   └── README.md               # Testing documentation
    ├── server.js                   # Express server initialization
    ├── app.js                      # Express app setup (routes, middleware)
    ├── setup-sessions.js           # Session store setup script
    ├── reset-password.js           # Utility for password reset
    ├── test-email.js               # Email configuration test
    ├── vercel.json                 # Vercel deployment config
    ├── package.json                # Server dependencies
    ├── package-lock.json           # Locked dependency versions
    ├── config.env                  # Environment variables (git-ignored)
    ├── config.env.example          # Example environment template
    └── .env                        # Additional env vars (git-ignored)
```

## Key Organizational Principles

### Backend (Express.js)

**Separation of Concerns**
- `routes/` - Defines endpoints and maps to controllers
- `controller/` - Handles request/response logic
- `services/` - Contains reusable business logic
- `middlewares/` - Cross-cutting concerns (auth, logging, validation)
- `data/` - Database query abstraction
- `config/` - External service configuration

**Route Organization**
Routes are organized by domain (auth, submissions, admin, users, etc.). Each file in `routes/` exports an Express Router with all endpoints for that domain.

**Middleware Pattern**
Express middleware is applied in `app.js` in this order:
1. Security headers (Helmet)
2. CORS setup
3. Body/cookie parsing
4. Session setup
5. Authentication
6. Route handlers
7. Error handling

### Frontend (Angular)

**Feature-Based Module Organization**
- `admin/` - Admin dashboard module
- `adminSide/` - Admin components
- `facultySide/` - Faculty review components
- `superAdmin/` - Super admin components

**Core Utilities**
- `service/` - HTTP services for API communication
- `guards/` - Route guards (AuthGuard, RoleGuard)
- `interceptors/` - HTTP interceptors for token injection
- `interface/` - Shared TypeScript types

**Styling**
- `styles.css` - Global styles
- `custom-theme.scss` - Theme overrides (PrimeNG + Angular Material)
- Component-level CSS files in respective component folders

### Configuration Management

**Backend Configuration**
- `server/config.env` - Environment variables (git-ignored)
- `server/config/` - Service-specific configs (passport, mailer, S3)

**Frontend Configuration**
- Runtime config in `client/src/index.html` (window.appConfig)
- Environment files in `client/src/environments/`
- No hardcoded API URLs in application code

### Database Layer

**Multi-Database Support**
- MongoDB for primary data storage
- PostgreSQL for session persistence
- Supabase for backend services
- AWS S3 for file storage

**Direct Driver Usage**
No ORM abstraction layer. Database queries use native drivers directly for flexibility and performance.

## Git Structure

**Main Branch**: `main` - Production-ready code

**Important Ignored Directories** (see `.gitignore`):
- `node_modules/` - Dependencies
- `dist/`, `build/` - Build outputs
- `.angular/` - Angular build cache
- `logs/` - Application logs
- `.env`, `*.env` - Environment variables
- `.vscode/`, `.idea/` - IDE settings

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Controllers | `*Controller.js` | `authController.js` |
| Services | `*Service.js` | `emailService.js` |
| Routes | `*.js` in routes/ | `submissions.js` |
| Middlewares | `*Middleware.js` | `authMiddleware.js` |
| Angular Components | `*.component.ts` | `auth.component.ts` |
| Angular Services | `*.service.ts` | `api.service.ts` |
| Angular Guards | `*.guard.ts` | `auth.guard.ts` |
| Angular Interfaces | `*.interface.ts` | `user.interface.ts` |

## Environment-Specific Files

**Backend**
- `server/config.env` - Development/production env vars

**Frontend**
- `client/src/environments/environment.ts` - Development
- `client/src/environments/environment.prod.ts` - Production

## Build Artifacts (Git-Ignored)

- `client/dist/` - Angular production build
- `client/.angular/cache/` - Angular build cache
- `server/logs/` - Application logs
- `dist/`, `build/` - Generic build output directories

## Documentation Files

- `API.md` - Complete REST API reference
- `SECURITY_AUDIT_FINDINGS.md` - Security review results
- `SESSION_REGENERATION_*.md` - Session management documentation
- `README.md` (if present) - Project readme

All steering guides are in `.kiro/steering/` for Kiro AI reference.
