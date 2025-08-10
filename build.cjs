#!/usr/bin/env node

// Custom build script to handle Vercel permission issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Starting custom build process...');
  
  // Make vite executable
  const vitePath = path.join(__dirname, 'node_modules', '.bin', 'vite');
  if (fs.existsSync(vitePath)) {
    try {
      fs.chmodSync(vitePath, '755');
      console.log('Set vite permissions successfully');
    } catch (err) {
      console.log('Could not set vite permissions:', err.message);
    }
  }
  
  // Run vite build directly
  console.log('Running vite build...');
  execSync('node node_modules/vite/bin/vite.js build', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}