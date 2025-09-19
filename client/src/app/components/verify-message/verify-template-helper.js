import fs from 'fs';
import path from 'path';

// Helper function to read HTML template and replace placeholders
export const getVerificationTemplate = async (templateName, data = {}) => {
  try {
    const templatePath = path.join(process.cwd(), 'client/src/app/components/verify-message', `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders with actual data
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, data[key] || '');
    });
    
    return html;
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return '<html><body><h1>Error loading template</h1></body></html>';
  }
};

// Available templates
export const TEMPLATES = {
  SUCCESS: 'verify-success',
  INVALID: 'verify-invalid', 
  USED: 'verify-used',
  EXPIRED: 'verify-expired'
};
