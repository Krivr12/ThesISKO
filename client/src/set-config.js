const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

console.log('Current working directory:', process.cwd());
console.log('Script location:', __dirname);
console.log('Environment variables:');
console.log('- AUTH_API_URL:', process.env.AUTH_API_URL);
console.log('- RECORDS_API_URL:', process.env.RECORDS_API_URL);

// Write to the public folder (as configured in angular.json)
const publicDir = path.join(process.cwd(), 'public');
console.log('Public directory path:', publicDir);

if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir, { recursive: true });
} else {
  console.log('Public directory already exists');
}

const config = {
  authApiUrl: process.env.AUTH_API_URL || "http://localhost:3000",
  recordsApiUrl: process.env.RECORDS_API_URL || "http://localhost:5050/records"
};

const configPath = path.join(publicDir, 'config.json');
console.log('Writing config to:', configPath);

try {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Config written successfully!');
  console.log('Config contents:', config);
  
  // Verify the file was written
  const writtenContent = fs.readFileSync(configPath, 'utf8');
  console.log('Verified written content:', writtenContent);
} catch (error) {
  console.error('❌ Error writing config:', error);
}