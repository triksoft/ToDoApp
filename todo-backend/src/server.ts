import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint to verify bridge connection
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Bridge connected successfully!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || '';

// server.ts
 // Changed to 5001 to bypass AirPlay

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));