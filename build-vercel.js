#!/usr/bin/env node

// Custom build script for Vercel to avoid permission issues
const { build } = require('vite');
const path = require('path');

async function buildApp() {
  try {
    console.log('Starting Vite build...');
    
    await build({
      root: process.cwd(),
      build: {
        outDir: 'dist',
        emptyOutDir: true
      }
    });
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildApp();