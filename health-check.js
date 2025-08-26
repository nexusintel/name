#!/usr/bin/env node

import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { connectToDatabase } from './db/index.js';

// Convert exec to Promise-based
const execPromise = promisify(exec);

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Formatting utilities
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (text) => console.log(`${colors.blue}ℹ️ INFO:${colors.reset} ${text}`),
  success: (text) => console.log(`${colors.green}✅ SUCCESS:${colors.reset} ${text}`),
  warn: (text) => console.log(`${colors.yellow}⚠️ WARNING:${colors.reset} ${text}`),
  error: (text) => console.log(`${colors.red}❌ ERROR:${colors.reset} ${text}`),
  section: (text) => console.log(`\n${colors.magenta}📋 ${text}${colors.reset}\n` + '-'.repeat(60)),
};

/**
 * Health check functions
 */
async function checkEnvironmentFiles() {
  log.section('Environment Files Check');
  
  const files = [
    { path: path.resolve(__dirname, '.env'), name: 'Server .env', required: true },
    { path: path.resolve(rootDir, '.env.local'), name: 'Frontend .env.local', required: true },
  ];
  
  let allPassed = true;
  
  for (const file of files) {
    try {
      const exists = fs.existsSync(file.path);
      
      if (exists) {
        log.success(`${file.name} found`);
        
        // Check content of file
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        log.info(`Found ${lines.length} configuration entries`);
      } else if (file.required) {
        log.error(`${file.name} not found (required)`);
        allPassed = false;
      } else {
        log.warn(`${file.name} not found (optional)`);
      }
    } catch (err) {
      log.error(`Error checking ${file.name}: ${err.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function checkServerEnvVariables() {
  log.section('Server Environment Variables');
  
  const requiredVars = [
    { name: 'MONGODB_URI', desc: 'MongoDB connection string' },
    { name: 'JWT_SECRET', desc: 'JWT authentication secret key' },
  ];
  
  const optionalVars = [
    { name: 'PORT', desc: 'Server port', default: '5000' },
    { name: 'DB_NAME', desc: 'Database name', default: 'torch-fellowship' },
    { name: 'GEMINI_API_KEY', desc: 'Google Gemini API key for AI assistant' },
    { name: 'CLOUDINARY_CLOUD_NAME', desc: 'Cloudinary cloud name' },
    { name: 'CLOUDINARY_API_KEY', desc: 'Cloudinary API key' },
    { name: 'CLOUDINARY_API_SECRET', desc: 'Cloudinary API secret' },
    { name: 'JWT_EXPIRES_IN', desc: 'JWT token expiration', default: '90d' },
  ];
  
  let allRequired = true;
  
  // Check required variables
  for (const v of requiredVars) {
    if (process.env[v.name]) {
      log.success(`${v.name} is set`);
    } else {
      log.error(`${v.name} is not set (${v.desc}) - REQUIRED`);
      allRequired = false;
    }
  }
  
  // Check optional variables
  for (const v of optionalVars) {
    if (process.env[v.name]) {
      log.success(`${v.name} is set`);
    } else {
      log.warn(`${v.name} is not set (${v.desc}) - using default: ${v.default || 'none'}`);
    }
  }
  
  return allRequired;
}

async function checkDatabaseConnection() {
  log.section('Database Connection');
  
  try {
    if (!process.env.MONGODB_URI) {
      log.error('MONGODB_URI is not set. Cannot test database connection.');
      return false;
    }
    
    log.info('Attempting to connect to MongoDB...');
    const db = await connectToDatabase();
    
    if (db) {
      log.success('Successfully connected to MongoDB');
      
      // Check collections
      const collections = await db.listCollections().toArray();
      log.info(`Found ${collections.length} collections`);
      
      if (collections.length > 0) {
        log.info('Collections: ' + collections.map(c => c.name).join(', '));
      } else {
        log.warn('No collections found in database. This might be a new database.');
      }
      
      return true;
    } else {
      log.error('Failed to connect to MongoDB (no db returned)');
      return false;
    }
  } catch (error) {
    log.error(`Database connection error: ${error.message}`);
    return false;
  }
}

async function checkExternalServices() {
  log.section('External Services');
  
  // Check Gemini API
  if (process.env.GEMINI_API_KEY) {
    log.info('Gemini API key is configured, but validation requires an API call (skipped)');
  } else {
    log.warn('Gemini API key is not configured - AI assistant will not work');
  }
  
  // Check Cloudinary
  const hasCloudinary = (
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
  );
  
  if (hasCloudinary) {
    log.info('Cloudinary configuration is present, but validation requires an API call (skipped)');
  } else {
    log.warn('Cloudinary is not fully configured - image uploads will not work');
  }
  
  return true;
}

async function checkNpmDependencies() {
  log.section('NPM Dependencies');
  
  try {
    // Check backend dependencies
    log.info('Checking backend dependencies...');
    await execPromise('cd server && npm ls --depth=0');
    log.success('Backend dependencies are installed correctly');
    
    // Check frontend dependencies
    log.info('Checking frontend dependencies...');
    await execPromise('npm ls --depth=0');
    log.success('Frontend dependencies are installed correctly');
    
    return true;
  } catch (error) {
    if (error.stderr.includes('missing:')) {
      log.error('Missing dependencies found:');
      console.log(error.stderr);
      return false;
    } else if (error.stderr.includes('extraneous:')) {
      log.warn('Extraneous dependencies found (not critical):');
      console.log(error.stderr);
      return true;
    } else {
      log.error('Error checking dependencies:');
      console.log(error.stderr || error);
      return false;
    }
  }
}

async function runTests() {
  log.section('Project Health Check');
  
  const results = {
    envFiles: await checkEnvironmentFiles(),
    envVars: await checkServerEnvVariables(),
    database: await checkDatabaseConnection(),
    externalServices: await checkExternalServices(),
  };
  
  // Generate summary
  log.section('Summary');
  
  const summary = [
    { name: 'Environment Files', status: results.envFiles },
    { name: 'Environment Variables', status: results.envVars },
    { name: 'Database Connection', status: results.database },
    { name: 'External Services', status: results.externalServices },
  ];
  
  for (const item of summary) {
    if (item.status) {
      log.success(`${item.name}: OK`);
    } else {
      log.error(`${item.name}: ISSUES DETECTED`);
    }
  }
  
  const overallStatus = Object.values(results).every(r => r);
  
  if (overallStatus) {
    log.section('✨ Project is healthy and ready to run! ✨');
    log.info('Start the server with: npm run server');
    log.info('Start the frontend with: npm run dev');
    log.info('Or run both together with: npm run dev:all');
  } else {
    log.section('⚠️ Issues detected - please fix them before running the application ⚠️');
    log.info('Check the logs above for specific issues and how to fix them');
  }
  
  return overallStatus;
}

// Run all checks
runTests().catch(err => {
  log.error(`Unhandled error in health check: ${err.message}`);
  process.exit(1);
});