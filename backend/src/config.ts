import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://korrektur:korrektur@localhost:5432/korrektur_app',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? '/data/korrektur-app/scans',
  baseUrl: process.env.BASE_URL ?? 'https://syntrokids.de',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
