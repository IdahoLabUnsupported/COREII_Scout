// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from './auth/passport';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import sourceRoutes from './routes/sourceRoutes';
import reportRoutes from './routes/reportRoutes';
import utilityRoutes from './routes/utilityRoutes';
import settingsRoutes from './routes/settingsRoutes';
import investigationRoutes from './routes/investigationRoutes';
import rssCollectorRoutes from './routes/rssCollectorRoutes';
import Settings from './models/Settings';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.DB_URI;

const connectionOptions = {
    dbName: process.env.DB_NAME,
}

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path.includes('newgenreporttextversion')) {
    console.log('Generated Report save request detected!');
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Content-Type:', req.headers['content-type']);
  }
  next();
});

app.use(passport.initialize());

app.use(authRoutes);
app.use(userRoutes);
app.use(sourceRoutes);
app.use(investigationRoutes);
app.use(reportRoutes);
app.use(utilityRoutes);
app.use(settingsRoutes);
app.use('/api/rss-collector', rssCollectorRoutes);

mongoose.connect(MONGO_URI || "", connectionOptions)
    .then(async () => {
        // Initialize default settings and RSS feeds if they don't exist
        await Settings.ensureInitialized();
        console.log('Database settings initialized');
        
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(error => console.error('Connection error', error));
