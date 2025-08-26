// test-env.js - Simple test to verify environment variables
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Loading environment variables...');
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Testing environment variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'LOADED' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'LOADED' : 'MISSING');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'LOADED' : 'MISSING');

if (process.env.MONGODB_URI) {
    console.log('MongoDB URI length:', process.env.MONGODB_URI.length);
    console.log('MongoDB URI starts with:', process.env.MONGODB_URI.substring(0, 20) + '...');
}