// env-debug.js - Tool to verify environment variables are loading correctly
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Attempting to load environment variables...');

try {
  const result = dotenv.config({ path: path.resolve(__dirname, '.env') });
  console.log('Dotenv result:', result.parsed ? 'Successfully parsed' : 'No variables parsed');
  
  console.log('\n--- Environment Variables Check ---');
  console.log('MONGODB_URI exists:', Boolean(process.env.MONGODB_URI));
  if (process.env.MONGODB_URI) {
    console.log('MONGODB_URI length:', process.env.MONGODB_URI.length);
    console.log('MONGODB_URI type:', typeof process.env.MONGODB_URI);
    console.log('MONGODB_URI starts with:', process.env.MONGODB_URI.substring(0, 15) + '...');
  }
  
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('GEMINI_API_KEY exists:', Boolean(process.env.GEMINI_API_KEY));
  console.log('JWT_SECRET exists:', Boolean(process.env.JWT_SECRET));
  
  console.log('\nAll environment variables:');
  const envVars = Object.keys(process.env).filter(key => 
    !key.startsWith('npm_') && !key.startsWith('_')
  );
  console.log(envVars.join(', '));
  
} catch (error) {
  console.error('Error loading environment variables:', error);
}