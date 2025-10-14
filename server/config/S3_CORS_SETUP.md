# S3 CORS Configuration for Direct Uploads

## 🔴 Problem

When uploading files directly from the browser to S3, you may encounter this error:

```
Access to fetch at 'https://thesisko-documents.s3.ap-southeast-2.amazonaws.com/...'
from origin 'http://localhost:4200' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Why does this happen?**

When the frontend tries to upload directly to S3 using a pre-signed URL, the browser sends a CORS preflight request (OPTIONS) to S3. If S3 doesn't have the proper CORS configuration, it will reject the request.

---

## ✅ Solution: Configure S3 Bucket CORS

You need to add CORS rules to your `thesisko-documents` S3 bucket to allow uploads from your frontend domains.

### Method 1: AWS Console (Easiest)

1. Open **AWS S3 Console**: https://s3.console.aws.amazon.com/s3/buckets
2. Click on your bucket: `thesisko-documents`
3. Go to the **Permissions** tab
4. Scroll down to **Cross-origin resource sharing (CORS)**
5. Click **Edit**
6. **Copy and paste** the configuration from `s3-cors-config.json`
7. Click **Save changes**
8. ✅ Done! Test your upload again.

### Method 2: AWS CLI (Automated)

**Prerequisites:**
- AWS CLI installed: https://aws.amazon.com/cli/
- AWS credentials configured: `aws configure`

**Windows:**
```bash
cd server/scripts
configure-s3-cors.bat
```

**Mac/Linux:**
```bash
cd server/scripts
chmod +x configure-s3-cors.sh
./configure-s3-cors.sh
```

### Method 3: Manual AWS CLI Command

```bash
aws s3api put-bucket-cors \
  --bucket thesisko-documents \
  --cors-configuration file://server/config/s3-cors-config.json
```

Verify the configuration:
```bash
aws s3api get-bucket-cors --bucket thesisko-documents
```

---

## 📋 CORS Configuration Explained

```json
{
  "AllowedOrigins": [
    "http://localhost:4200",      // Angular dev server
    "http://localhost:5050",      // Node backend dev
    "https://thesisko.vercel.app", // Production frontend
    "https://*.vercel.app"        // Vercel preview deployments
  ],
  "AllowedMethods": [
    "GET",    // Download files
    "PUT",    // Upload files (pre-signed URL uses PUT)
    "POST",   // Alternative upload method
    "DELETE", // Delete files (if needed)
    "HEAD"    // Check file existence
  ],
  "AllowedHeaders": ["*"],  // Allow all headers from browser
  "ExposeHeaders": [
    "ETag",                        // File version/checksum
    "x-amz-server-side-encryption" // Encryption info
  ],
  "MaxAgeSeconds": 3000  // Cache preflight for 50 minutes
}
```

---

## 🧪 Testing

After applying the CORS configuration:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload your app** (F5)
3. **Try uploading a file** in the submission page
4. **Check browser console** - no more CORS errors! ✅

---

## 🔒 Security Notes

### Production Deployment

When deploying to production, update the `AllowedOrigins` to include **ONLY** your production domain:

```json
"AllowedOrigins": [
  "https://thesisko.vercel.app",
  "https://your-custom-domain.com"
]
```

### Why Allow Multiple Origins?

- `http://localhost:4200` - Angular development server
- `http://localhost:5050` - Backend API development
- `https://thesisko.vercel.app` - Production frontend
- `https://*.vercel.app` - Vercel preview deployments (PR previews)

### Remove Localhost in Production

For production buckets, remove localhost origins to prevent unauthorized access:

```json
"AllowedOrigins": [
  "https://thesisko.vercel.app"
]
```

---

## ❓ Troubleshooting

### Still getting CORS errors?

1. **Wait 1-2 minutes** - S3 CORS changes take time to propagate
2. **Hard refresh browser** - Ctrl+Shift+R (clear cache)
3. **Check bucket name** - Make sure it's `thesisko-documents`
4. **Verify configuration**:
   ```bash
   aws s3api get-bucket-cors --bucket thesisko-documents
   ```

### AWS CLI not working?

- Install AWS CLI: https://aws.amazon.com/cli/
- Configure credentials: `aws configure`
- Enter your Access Key ID and Secret Access Key

### Permission denied?

Your AWS user needs the `s3:PutBucketCORS` permission:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetBucketCORS",
    "s3:PutBucketCORS"
  ],
  "Resource": "arn:aws:s3:::thesisko-documents"
}
```

---

## 📚 References

- [AWS S3 CORS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [CORS Preflight Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#preflighted_requests)
- [S3 Pre-signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

**Need help?** Contact the development team or check AWS S3 console logs.

