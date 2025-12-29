const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const { authenticateUser, authenticateAdmin } = require('../middleware/auth');

const DOCKER_CONTAINER_NAME = 'direitaai-voice';

const runDockerCommand = (command, cwd = null) => {
  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    exec(command, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`Docker command error: ${error.message}`);
        resolve({ success: false, error: error.message, output: stderr || error.message });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
};

// Middleware de autenticação opcional por enquanto para facilitar debug, 
// mas idealmente deve ser descomentado em produção estrita.
// router.use(authenticateUser, authenticateAdmin);

router.get('/status', async (req, res) => {
  // Check if docker is available first
  const dockerCheck = await runDockerCommand('docker --version');
  if (!dockerCheck.success) {
    return res.json({
      success: true,
      status: 'stopped',
      details: 'Docker not installed or not available in this environment (e.g. Vercel)',
      raw: dockerCheck.error
    });
  }

  // Check if container is running
  const { success, output } = await runDockerCommand(`docker inspect -f "{{.State.Running}}" ${DOCKER_CONTAINER_NAME}`);
  
  if (!success) {
    return res.json({ 
      success: true, 
      status: 'stopped', 
      details: 'Container not found',
      raw: output
    });
  }
  
  const isRunning = output.trim() === 'true';
  res.json({ 
    success: true, 
    status: isRunning ? 'running' : 'stopped',
    details: isRunning ? 'Service is active' : 'Service is stopped'
  });
});

router.post('/start', async (req, res) => {
  // Check docker availability
  const dockerCheck = await runDockerCommand('docker --version');
  if (!dockerCheck.success) {
    return res.status(500).json({
      success: false,
      error: 'Docker not available',
      details: 'This environment does not support Docker (e.g. Vercel Serverless). You must run the Voice Service on a VPS or Local Machine.'
    });
  }

  // First try to start existing container
  let result = await runDockerCommand(`docker start ${DOCKER_CONTAINER_NAME}`);
  
  if (result.success) {
    return res.json({ success: true, message: 'Container started' });
  }
  
  // If failed because it doesn't exist, try docker-compose up
  if (result.output && (result.output.includes('No such container') || result.output.includes('Error response from daemon'))) {
    console.log('Container not found, attempting docker-compose up...');
    
    // Adjust path: routes -> backend-oficial -> DIREITAI -> ai-voice-service
    // Use absolute path resolution for safety
    const voiceServicePath = path.resolve(__dirname, '../../ai-voice-service');
    console.log(`Looking for docker-compose in: ${voiceServicePath}`);
    
    // Try 'docker compose' (v2) first, then 'docker-compose' (v1)
    let composeResult = await runDockerCommand('docker compose up -d', voiceServicePath);
    
    if (!composeResult.success) {
        console.log('docker compose failed, trying docker-compose...');
        composeResult = await runDockerCommand('docker-compose up -d', voiceServicePath);
    }
    
    if (composeResult.success) {
      return res.json({ success: true, message: 'Container created and started via Docker Compose' });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to start container (Compose failed)', 
        details: composeResult.output,
        path: voiceServicePath
      });
    }
  }

  // Other error
  res.status(500).json({ success: false, error: 'Failed to start container', details: result.output });
});

router.post('/stop', async (req, res) => {
  const { success, output } = await runDockerCommand(`docker stop ${DOCKER_CONTAINER_NAME}`);
  res.json({ success, message: success ? 'Container stopped' : 'Failed to stop', details: output });
});

router.post('/restart', async (req, res) => {
  const { success, output } = await runDockerCommand(`docker restart ${DOCKER_CONTAINER_NAME}`);
  res.json({ success, message: success ? 'Container restarted' : 'Failed to restart', details: output });
});

module.exports = router;
