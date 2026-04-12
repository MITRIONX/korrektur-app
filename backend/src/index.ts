import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import klassenRoutes from './routes/klassen';
import schuelerRoutes from './routes/schueler';
import arbeitenRoutes from './routes/arbeiten';
import scansRoutes from './routes/scans';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Klassen routes
app.use('/api/klassen', klassenRoutes);

// Schueler routes (nested under klassen)
app.use('/api/klassen/:klasseId/schueler', schuelerRoutes);

// Arbeiten routes
app.use('/api/arbeiten', arbeitenRoutes);

// Scans routes (mounted at same /api/arbeiten prefix, handles /:arbeitId/scans)
app.use('/api/arbeiten', scansRoutes);

// Start server only when run directly
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export { app };
