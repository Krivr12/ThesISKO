const fs = require('fs');

const config = {
  authApiUrl: process.env.AUTH_API_URL,
  recordsApiUrl: process.env.RECORDS_API_URL
};

fs.writeFileSync('./dist/your-app-name/assets/config.json', JSON.stringify(config));
