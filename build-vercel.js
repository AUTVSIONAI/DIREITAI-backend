#!/usr/bin/env node

// Custom build script for Vercel to avoid permission issues
import { build } from 'vite';
import path from 'path';

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