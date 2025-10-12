#!/bin/bash

# Script to configure CORS for S3 bucket
# This allows direct uploads from the frontend to S3

BUCKET_NAME="thesisko-documents"
CONFIG_FILE="server/config/s3-cors-config.json"

echo "🔧 Configuring CORS for S3 bucket: $BUCKET_NAME"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null
then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ CORS config file not found: $CONFIG_FILE"
    exit 1
fi

# Apply CORS configuration
echo "📤 Applying CORS configuration..."
aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration file://$CONFIG_FILE

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "📋 Verifying configuration..."
    aws s3api get-bucket-cors --bucket $BUCKET_NAME
else
    echo "❌ Failed to apply CORS configuration"
    echo "Make sure you have the correct AWS credentials and permissions"
    exit 1
fi

echo ""
echo "🎉 Done! Your S3 bucket now accepts uploads from:"
echo "   - http://localhost:4200 (development)"
echo "   - http://localhost:5050 (backend dev)"
echo "   - https://thesisko.vercel.app (production)"
echo "   - https://*.vercel.app (Vercel preview deployments)"

