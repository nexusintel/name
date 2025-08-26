
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { UserRole } from '../utils/constants.js';

// Define DB_NAME with fallback but don't access MONGODB_URI yet
const DB_NAME = process.env.DB_NAME || 'torch-fellowship';

let db;

async function seedSuperAdmin() {
    const usersCollection = db.collection('users');
    const adminEmail = 'nexusintelligencesystems@gmail.com';
    const existingAdmin = await usersCollection.findOne({ email: adminEmail });

    if (!existingAdmin) {
        console.log('Super-Admin user not found, creating one...');
        const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
        await usersCollection.insertOne({
            email: adminEmail,
            password: hashedPassword,
            fullName: 'Super Admin',
            role: UserRole.SUPER_ADMIN,
            avatarUrl: null,
            createdAt: new Date().toISOString()
        });
        console.log('Super-Admin user created successfully.');
    }
}

async function createIndexes() {
    console.log('Applying database indexes...');
    try {
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('blog_posts').createIndex({ slug: 1 }, { unique: true });
        await db.collection('messages').createIndex({ authorId: 1 });
        await db.collection('messages').createIndex({ recipientId: 1 });
        await db.collection('messages').createIndex({ created_at: 1 });
        await db.collection('teachings').createIndex({ preached_at: -1 });
        console.log('Database indexes applied successfully.');
    } catch (error) {
        console.error('Error applying database indexes:', error);
    }
}

export const connectToDatabase = async () => {
    if (db) {
        return db;
    }
    try {
        console.log(`🔌 Attempting to connect to MongoDB`);
        console.log(`📊 Database name: ${DB_NAME}`);
        
        // Get MongoDB URI at function execution time, not module load time
        const MONGODB_URI = process.env.MONGODB_URI;
        
        console.log('MONGODB_URI in connectToDatabase:', MONGODB_URI ? 'defined' : 'undefined');
        console.log('Environment has been loaded:', process.env.NODE_ENV || 'not set');
        
        if (!MONGODB_URI) {
            console.error('\u26A0\uFE0F Environment variables check in connectToDatabase:');
            console.error('- process.env keys:', Object.keys(process.env).filter(k => 
                !k.startsWith('npm_') && 
                !k.startsWith('_')
            ).join(', '));
            throw new Error('MONGODB_URI is undefined - environment variables not loaded properly');
        }
        
        // Show connection string length for debugging
        console.log(`🔗 Connection string length: ${MONGODB_URI.length} characters`);
        console.log(`🔗 MONGODB_URI value type: ${typeof MONGODB_URI}`);
        
        // Clean potential quote marks from the connection string
        const cleanUri = MONGODB_URI.replace(/^"|"$|^'|'$/g, '').trim();
        console.log(`🔗 Clean URI length: ${cleanUri.length} characters`);
        
        const client = new MongoClient(cleanUri);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ Successfully connected to MongoDB.');
        
        await seedSuperAdmin();
        await createIndexes();

        return db;
    } catch (error) {
        console.error('❌ Could not connect to MongoDB:', error.message);
        console.error('Full error:', error);
        throw error;
    }
};

export const getDb = () => {
    if (!db) {
        throw new Error('Database not initialized! Call connectToDatabase first.');
    }
    return db;
};