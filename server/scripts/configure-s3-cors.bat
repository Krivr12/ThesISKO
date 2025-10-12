@echo off
REM Script to configure CORS for S3 bucket (Windows)
REM This allows direct uploads from the frontend to S3

set BUCKET_NAME=thesisko-documents
set CONFIG_FILE=server\config\s3-cors-config.json

echo ====================================================
echo Configuring CORS for S3 bucket: %BUCKET_NAME%
echo ====================================================
echo.

REM Check if AWS CLI is installed
where aws >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] AWS CLI is not installed. Please install it first.
    echo Visit: https://aws.amazon.com/cli/
    exit /b 1
)

REM Check if config file exists
if not exist "%CONFIG_FILE%" (
    echo [ERROR] CORS config file not found: %CONFIG_FILE%
    exit /b 1
)

REM Apply CORS configuration
echo Applying CORS configuration...
aws s3api put-bucket-cors --bucket %BUCKET_NAME% --cors-configuration file://%CONFIG_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] CORS configuration applied successfully!
    echo.
    echo Verifying configuration...
    aws s3api get-bucket-cors --bucket %BUCKET_NAME%
    echo.
    echo Done! Your S3 bucket now accepts uploads from:
    echo    - http://localhost:4200 (development)
    echo    - http://localhost:5050 (backend dev)
    echo    - https://thesisko.vercel.app (production)
    echo    - https://*.vercel.app (Vercel preview deployments)
) else (
    echo.
    echo [ERROR] Failed to apply CORS configuration
    echo Make sure you have the correct AWS credentials and permissions
    exit /b 1
)

