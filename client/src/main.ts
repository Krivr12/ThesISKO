import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Fetch runtime config before Angular starts
fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    // Store config globally so services can access it
    (window as any).__env = config;

    // Now bootstrap Angular
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  })
  .catch(err => {
    console.error('Failed to load config.json', err);
  });
