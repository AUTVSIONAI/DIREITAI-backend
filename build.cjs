#!/usr/bin/env node

// Custom build script for Vercel compatibility
const { execSync } = require('child_process');

try {
  console.log('Starting Vercel-compatible build process...');
  
  // Run vite build directly via Node.js
  console.log('Running vite build...');
  execSync('node node_modules/vite/bin/vite.js build', {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Error details:', error);
  process.exit(1);
}