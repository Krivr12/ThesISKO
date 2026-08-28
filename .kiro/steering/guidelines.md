# Development Guidelines & Rules

## File Creation Rules

### ❌ DO NOT Create Markdown Files Unless Explicitly Requested

- Do **NOT** create documentation files after every prompt or conversation turn
- Do **NOT** auto-generate README.md, CHANGELOG.md, or other docs without explicit user request
- Do **NOT** create analysis or summary markdown files as part of routine work
- Markdown files should only be created when:
  - User explicitly asks for documentation
  - User requests a spec or design document
  - User asks to document findings or decisions
  - Project requires it for a feature (e.g., API docs, setup guides)

### When to Create Code Files

Create source files when:
- Implementing features or bug fixes (required for task completion)
- Adding new services, controllers, or utilities (part of development work)
- Writing tests (if explicitly requested or part of feature work)
- Refactoring or reorganizing code (when necessary for design)

### Existing Documentation Policy

- Respect existing documentation (API.md, audit reports, session docs)
- Only update if changes are requested or directly related to code changes
- Don't create redundant copies of existing documentation

## Code Style Expectations

### Backend (JavaScript/Node.js)

- Use ES modules (import/export) - **no CommonJS**
- Async/await for asynchronous operations
- Error handling with try-catch blocks
- Controllers should be request handlers, not business logic
- Services should contain reusable business logic
- Middlewares should have single responsibility
- Follow naming conventions: `*Controller.js`, `*Service.js`, `*Middleware.js`

### Frontend (TypeScript/Angular)

- Use strict TypeScript (strict null checking)
- Components handle UI logic, services handle API communication
- Use RxJS Observables, avoid promises when possible
- Use Angular services for dependency injection
- Follow folder structure: feature modules, shared utilities, services
- Type everything - avoid `any` type

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Controller | `*Controller.js` | `authController.js` |
| Service | `*Service.js` | `emailService.js` |
| Middleware | `*Middleware.js` | `authMiddleware.js` |
| Route file | `*.js` | `submissions.js` |
| Angular component | `*.component.ts` | `login.component.ts` |
| Angular service | `*.service.ts` | `user.service.ts` |
| Angular guard | `*.guard.ts` | `auth.guard.ts` |

## Security Rules

### Never Commit Secrets

- **ALWAYS** verify `server/config.env` is in `.gitignore` before committing
- Do **NOT** log, echo, or display sensitive values (API keys, passwords, tokens)
- Reference secrets by key name only: "RESEND_API_KEY=***"
- Use `.env.example` template for documentation, never actual values

### Authentication & Authorization

- JWT tokens should be validated on every protected route
- Use role-based access control (RBAC) consistently
- Session regeneration should happen on login
- Always use HTTPS in production (enforce via Helmet)
- Rate limit authentication endpoints (already configured in `authRateLimiter.js`)

### Input Validation

- Validate all user input using `validator` package
- Sanitize database queries to prevent injection
- Use multer for file upload restrictions (already configured)
- Validate file types and sizes

## Development Workflow

### Before Making Changes

1. Read the relevant steering guides (product.md, tech.md, structure.md)
2. Understand the existing code pattern
3. Check if similar functionality already exists
4. Verify database schema and API contracts (see API.md)

### During Development

- Follow the project's code style and conventions
- Keep changes focused on the specific feature/fix
- Don't refactor unrelated code unless necessary
- Test changes locally before submitting

### After Changes

- Verify the build still works: `npm run build --prefix client` or `npm run build --prefix server`
- Check for obvious issues and runtime errors
- Don't automatically run full test suite - tests are currently placeholders

## Database Rules

### MongoDB & PostgreSQL

- Use native drivers directly (no ORM)
- Validate data before insertion
- Use proper error handling for connection issues
- PostgreSQL is for sessions only, MongoDB for main data
- Create indexes on frequently queried fields

### Data Consistency

- Validate schema on insert/update
- Use timestamps (created_at, updated_at) consistently
- Never delete data directly - use soft deletes if audit trail needed
- Handle race conditions in concurrent operations

## API Development

### REST Endpoints

- Follow RESTful conventions as documented in `API.md`
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return consistent error responses with proper status codes
- Validate request body schema before processing

### Response Format

```javascript
// Success
{ success: true, data: {...}, message: "Optional message" }

// Error
{ error: "error code", message: "Human readable message", statusCode: 400 }
```

### Authentication in API

- JWT tokens in Authorization header: `Authorization: Bearer <token>`
- Session-based auth via cookies (express-session)
- Both methods supported - validate in middleware

## File Upload & Storage

### AWS S3 Integration

- Use presigned URLs for secure file access
- Always validate file type and size before upload
- Store file metadata in MongoDB
- Use S3 CORS configuration from `server/config/s3-cors-config.json`
- Consider using AWS Glacier for archival (glacierService.js)

### File Limits

- Maximum file size: 100MB (configured)
- Allowed types: PDF, DOC, DOCX, TXT, ZIP
- Maximum files per submission: 10
- Store original filename separately from S3 key

## Email Communication

### Email Service

- Primary: Resend (via `emailService.js`)
- Fallback: Nodemailer
- Templates in `server/templates/email/`
- Use environment variables for credentials - **never hardcode**

### Webhook Handling

- Resend inbound emails handled via Svix webhooks
- Verify webhook signatures before processing
- Log all webhook events for debugging

## Performance Considerations

### Caching

- Node-cache is available for in-memory caching
- Cache user roles and permissions
- Invalidate cache on data updates
- Don't cache user-specific sensitive data

### Rate Limiting

- Auth endpoints: 5 requests per 15 minutes per IP
- General endpoints: 100 requests per 15 minutes per IP
- Already configured in middlewares

### Database Queries

- Use pagination for large result sets
- Add indexes for frequently queried fields
- Avoid N+1 query problems
- Use MongoDB aggregation pipeline for complex queries

## Dependency Management

### Adding Dependencies

- Use exact versions (no caret ranges)
- Only add well-maintained, reputable packages
- Check for security vulnerabilities before adding
- Update package.json with rationale in commit message

### Security Updates

- Regularly check for vulnerable dependencies
- Update critical security patches immediately
- Test thoroughly after updates
- Document breaking changes

## Testing

### Current State

- Test suite is currently a placeholder ("Error: no test specified")
- Do **NOT** assume tests will run
- Only write tests if explicitly requested by user

### When Tests Exist

- Keep tests focused and maintainable
- Use consistent naming: `*.test.js` or `*.spec.ts`
- Test business logic, not UI (for unit tests)
- Integration tests for API endpoints

## Build & Deployment

### Build Process

**Frontend:**
```bash
npm run build --prefix client
```
Creates optimized production build in `client/dist/`

**Backend:**
- No build needed (ES modules run directly)
- Start with: `npm run start --prefix server`

### Environment Configuration

- Development: Local env vars in `config.env`
- Production: Use deployment platform's secret management
- Never commit production secrets
- Use `.env.example` as template documentation

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connections working
- [ ] S3/AWS credentials set
- [ ] Email service configured
- [ ] Helmet security headers enabled
- [ ] CORS whitelist correct
- [ ] Rate limiters active
- [ ] Error logging configured
- [ ] Session store configured (PostgreSQL)

## Debugging & Troubleshooting

### Backend Debugging

- Check error logs: `server/logs/error.log`
- Use console.log strategically (avoid logging secrets)
- Enable detailed error messages in development
- Use middleware to log all requests if needed

### Frontend Debugging

- Use Angular DevTools Chrome extension
- Check browser console for errors
- Verify HTTP interceptor is injecting auth token
- Check network tab for API calls

### Common Issues

- **Session not persisting**: Check PostgreSQL connection and connect-pg-simple setup
- **S3 upload fails**: Verify AWS credentials, bucket name, and CORS config
- **Email not sending**: Check Resend/Nodemailer config and API keys
- **Auth failing**: Verify JWT secret, token format, and session middleware order

## When to Ask for Help

- Unclear architecture decisions
- Conflicting requirements
- Performance bottlenecks
- Security concerns
- Complex database migrations
- External service integration issues

## Summary of Key Rules

✅ DO:
- Follow existing code patterns
- Validate input and handle errors
- Use environment variables for config
- Test changes locally
- Create files only when needed for implementation

❌ DON'T:
- Create markdown docs without being asked
- Hardcode secrets or URLs
- Use CommonJS in backend
- Skip input validation
- Commit sensitive files
- Refactor unrelated code
