import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// CORS configuration for testing
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://your-app-name.netlify.app',  // Replace with your actual Netlify domain
      'https://your-custom-domain.com',     // If you have a custom domain
    ]
  : [
      'http://localhost:5173', 
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});