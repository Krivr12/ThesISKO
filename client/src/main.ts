import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

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
    // Validate config has required properties, fallback to environment config
    const finalConfig = {
      authApiUrl: config.authApiUrl || environment.authApiUrl,
      recordsApiUrl: config.recordsApiUrl || environment.recordsApiUrl
    };
    
    // Store config globally so services can access it
    (window as any).__env = finalConfig;
    console.log('✅ Loaded config:', finalConfig);

    // Now bootstrap Angular
    return bootstrapApplication(App, appConfig);
  })
  .catch(err => {
    console.error('⚠️ Failed to load config.json, using environment defaults:', err);
    
    // Use environment config if fetch fails
    const envConfig = {
      authApiUrl: environment.authApiUrl,
      recordsApiUrl: environment.recordsApiUrl
    };
    (window as any).__env = envConfig;
    console.log('🔄 Using environment config:', envConfig);
    
    // Bootstrap Angular with environment config
    return bootstrapApplication(App, appConfig);
  })
  .catch((err) => console.error('❌ Failed to bootstrap Angular:', err));