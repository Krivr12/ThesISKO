import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// Store environment config globally for services that need it
(window as any).__env = {
  authApiUrl: environment.authApiUrl,
  recordsApiUrl: environment.recordsApiUrl
};


// Bootstrap Angular
bootstrapApplication(App, appConfig)
  .catch((err) => console.error('❌ Failed to bootstrap Angular:', err));