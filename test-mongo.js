// test-mongo.js - Simple MongoDB connection test
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Loading environment variables...');
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testConnection() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in environment variables');
        }
        
        console.log('Attempting MongoDB connection...');
        console.log('URI length:', MONGODB_URI.length);
        
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        
        console.log('✅ Successfully connected to MongoDB!');
        
        // Test database access
        const db = client.db('torch-fellowship');
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        await client.close();
        console.log('Connection closed.');
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('Full error:', error);
    }
}

testConnection();