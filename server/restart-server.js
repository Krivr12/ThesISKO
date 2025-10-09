#!/usr/bin/env node

// Simple script to restart the server with better error handling
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Restarting server...');

// Kill any existing node processes on port 5050
const killProcess = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
  stdio: 'inherit',
  shell: true 
});

killProcess.on('close', (code) => {
  console.log(`🛑 Killed existing processes (exit code: ${code})`);
  
  // Wait a moment before starting new server
  setTimeout(() => {
    console.log('🚀 Starting new server...');
    
    // Start the server
    const server = spawn('node', ['--env-file=config.env', 'server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });
    
    server.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
    });
    
    server.on('close', (code) => {
      console.log(`🔄 Server process exited with code ${code}`);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      server.kill('SIGINT');
      process.exit(0);
    });
    
  }, 2000); // Wait 2 seconds before starting
});

killProcess.on('error', (error) => {
  console.log('ℹ️ No existing processes to kill:', error.message);
  
  // Start the server directly
  console.log('🚀 Starting server...');
  const server = spawn('node', ['--env-file=config.env', 'server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });
});
