import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Default fallback config
const defaultConfig = {
  authApiUrl: 'http://localhost:5050',
  recordsApiUrl: 'http://localhost:5050/records'
};

// Fetch runtime config before Angular starts
fetch('/config.json')
  .then(response => {
    console.log('Config fetch response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(config => {
    // Validate config has required properties
    const finalConfig = {
      authApiUrl: config.authApiUrl || defaultConfig.authApiUrl,
      recordsApiUrl: config.recordsApiUrl || defaultConfig.recordsApiUrl
    };
    
    // Store config globally so services can access it
    (window as any).__env = finalConfig;
    console.log('✅ Loaded config:', finalConfig);

    // Now bootstrap Angular
    return bootstrapApplication(App, appConfig);
  })
  .catch(err => {
    console.error('⚠️ Failed to load config.json, using defaults:', err);
    
    // Use default config if fetch fails
    (window as any).__env = defaultConfig;
    console.log('🔄 Using default config:', defaultConfig);
    
    // Bootstrap Angular with default config
    return bootstrapApplication(App, appConfig);
  })
  .catch((err) => console.error('❌ Failed to bootstrap Angular:', err));