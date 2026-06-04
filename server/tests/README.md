# ThesISKO Tests

This directory contains basic tests for the ThesISKO system.

## Available Tests

### 1. Database Connection Test
```bash
node tests/database-connection.test.js
```
Tests connectivity to MongoDB and PostgreSQL databases.

### 2. S3 Connection Test
```bash
node tests/s3-connection.test.js
```
Tests AWS S3 connection and bucket access permissions.

### 3. Authentication Test
```bash
node tests/auth.test.js
```
Tests JWT token generation and validation.

### 4. Email Service Test
```bash
node test-email.js
```
Tests email service configuration and sending (located in server root).

## Running All Tests

```bash
# From server directory
npm run test
```

## Requirements

- All tests require proper environment variables in `config.env`
- Database tests require MongoDB and PostgreSQL to be running
- S3 tests require valid AWS credentials
- Email tests require valid email provider credentials

## Test Results

Each test will:
- ✅ Show PASS for successful tests
- ❌ Show FAIL for failed tests
- Exit with code 0 (success) or 1 (failure)

## Adding New Tests

When adding new tests:
1. Create a new `.test.js` file in this directory
2. Follow the existing test structure
3. Include clear console output with emojis
4. Exit with appropriate status code
5. Update this README
