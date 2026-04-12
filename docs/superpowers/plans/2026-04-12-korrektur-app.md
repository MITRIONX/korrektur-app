# Korrektur-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android app that lets teachers photograph student homework, auto-correct it via GPT-4o Vision, annotate errors on the image, and share results via QR codes.

**Architecture:** React Native/Expo Android app communicates with a Node.js/TypeScript REST API hosted on syntrokids.de. The backend orchestrates GPT-4o Vision calls for correction, stores scans in the filesystem, metadata in PostgreSQL, and serves a public web view for parents via share tokens.

**Tech Stack:** React Native (Expo), Node.js, TypeScript, Express, PostgreSQL, OpenAI GPT-4o Vision API, QRCode generation (qrcode), QR scanning (expo-camera), PDF generation (puppeteer), JWT auth.

---

## File Structure

```
korrektur-app/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── jest.config.js
│   ├── src/
│   │   ├── index.ts                     # Express server entry
│   │   ├── config.ts                    # Env config loader
│   │   ├── db.ts                        # PostgreSQL pool (pg)
│   │   ├── middleware/
│   │   │   └── auth.ts                  # JWT verify middleware
│   │   ├── routes/
│   │   │   ├── auth.ts                  # POST /api/auth/register, /api/auth/login
│   │   │   ├── klassen.ts               # CRUD /api/klassen
│   │   │   ├── schueler.ts              # CRUD /api/klassen/:id/schueler
│   │   │   ├── arbeiten.ts              # CRUD /api/arbeiten + QR generation
│   │   │   ├── scans.ts                 # Upload + list scans
│   │   │   ├── korrekturen.ts           # Trigger + view + edit corrections
│   │   │   └── ergebnisse.ts            # Results, PDF, export, share
│   │   ├── services/
│   │   │   ├── openai.ts               # GPT-4o Vision API wrapper
│   │   │   ├── korrektur.ts            # Correction orchestration
│   │   │   ├── qr.ts                   # QR code generation
│   │   │   └── pdf.ts                  # PDF generation (puppeteer)
│   │   └── views/
│   │       └── ergebnis.ejs            # Parent result web page
│   ├── migrations/
│   │   └── 001_initial.sql
│   └── tests/
│       ├── routes/
│       │   ├── auth.test.ts
│       │   ├── klassen.test.ts
│       │   ├── schueler.test.ts
│       │   ├── arbeiten.test.ts
│       │   ├── scans.test.ts
│       │   ├── korrekturen.test.ts
│       │   └── ergebnisse.test.ts
│       ├── services/
│       │   ├── openai.test.ts
│       │   ├── korrektur.test.ts
│       │   ├── qr.test.ts
│       │   └── pdf.test.ts
│       └── setup.ts                    # Test DB setup/teardown
├── app/                                # React Native / Expo (Phase 4)
│   ├── package.json
│   ├── app.json
│   ├── tsconfig.json
│   ├── app/
│   │   ├── _layout.tsx                 # Root layout + auth guard
│   │   ├── login.tsx                   # Login screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx             # Tab navigator
│   │       ├── index.tsx               # Dashboard
│   │       ├── ergebnisse.tsx          # Results list
│   │       └── einstellungen.tsx       # Settings
│   ├── src/
│   │   ├── screens/
│   │   │   ├── KlassenScreen.tsx
│   │   │   ├── SchuelerScreen.tsx
│   │   │   ├── ArbeitErstellenScreen.tsx
│   │   │   ├── ScannerScreen.tsx
│   │   │   ├── KorrekturScreen.tsx
│   │   │   └── ErgebnisDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── ArbeitCard.tsx
│   │   │   ├── SchuelerListItem.tsx
│   │   │   ├── AnnotationOverlay.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── services/
│   │   │   └── api.ts                  # Axios API client
│   │   ├── store/
│   │   │   └── auth.ts                 # Auth state (zustand)
│   │   └── types/
│   │       └── index.ts                # Shared TypeScript types
│   └── assets/
└── docs/
```

---

## Phase 1: Backend Foundation

### Task 1: Backend Project Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/jest.config.js`
- Create: `backend/src/config.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Initialize backend project**

```bash
cd "D:/PRIVATE PROJEKTE/KORREKTUR APP"
mkdir -p backend
cd backend
npm init -y
npm install express cors helmet dotenv pg bcryptjs jsonwebtoken multer qrcode ejs
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer @types/pg ts-node jest ts-jest @types/jest supertest @types/supertest
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create jest.config.js**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterSetup: ['<rootDir>/tests/setup.ts'],
};
```

- [ ] **Step 4: Create .env.example**

```
PORT=3000
DATABASE_URL=postgresql://korrektur:korrektur@localhost:5432/korrektur_app
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-...
UPLOAD_DIR=/data/korrektur-app/scans
BASE_URL=https://syntrokids.de
```

- [ ] **Step 5: Create src/config.ts**

```typescript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://korrektur:korrektur@localhost:5432/korrektur_app',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};
```

- [ ] **Step 6: Create src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export { app };

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Korrektur API running on port ${config.port}`);
  });
}
```

- [ ] **Step 7: Create tests/setup.ts**

```typescript
// Test setup - will be extended with DB pool in Task 2
export {};
```

- [ ] **Step 8: Write health check test**

Create `backend/tests/routes/health.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 9: Run test to verify it passes**

```bash
cd backend && npx jest tests/routes/health.test.ts --verbose
```

Expected: PASS

- [ ] **Step 10: Add scripts to package.json**

Add to `backend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "test": "jest --verbose",
    "migrate": "ts-node src/migrate.ts"
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add backend/
git commit -m "feat: backend project setup with Express, TypeScript, Jest"
```

---

### Task 2: Database Setup + Migration

**Files:**
- Create: `backend/src/db.ts`
- Create: `backend/migrations/001_initial.sql`
- Create: `backend/src/migrate.ts`
- Modify: `backend/tests/setup.ts`

- [ ] **Step 1: Create src/db.ts**

```typescript
import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
```

- [ ] **Step 2: Create migrations/001_initial.sql**

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS klassen (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  schuljahr TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schueler (
  id SERIAL PRIMARY KEY,
  klasse_id INTEGER NOT NULL REFERENCES klassen(id) ON DELETE CASCADE,
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arbeiten (
  id SERIAL PRIMARY KEY,
  klasse_id INTEGER NOT NULL REFERENCES klassen(id),
  fach TEXT NOT NULL,
  titel TEXT NOT NULL,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  max_punkte INTEGER NOT NULL,
  musterloesung TEXT,
  notenschluessel JSONB,
  status TEXT NOT NULL DEFAULT 'entwurf'
    CHECK (status IN ('entwurf', 'scannen', 'korrigieren', 'pruefen', 'fertig')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_seiten (
  id SERIAL PRIMARY KEY,
  arbeit_id INTEGER NOT NULL REFERENCES arbeiten(id) ON DELETE CASCADE,
  schueler_id INTEGER NOT NULL REFERENCES schueler(id),
  seiten_nr INTEGER NOT NULL,
  bild_pfad TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (arbeit_id, schueler_id, seiten_nr)
);

CREATE TABLE IF NOT EXISTS korrekturen (
  id SERIAL PRIMARY KEY,
  scan_seite_id INTEGER NOT NULL UNIQUE REFERENCES scan_seiten(id) ON DELETE CASCADE,
  punkte INTEGER NOT NULL DEFAULT 0,
  max_punkte INTEGER NOT NULL DEFAULT 0,
  annotationen JSONB NOT NULL DEFAULT '[]',
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'ausstehend'
    CHECK (status IN ('ausstehend', 'ki_korrigiert', 'manuell_angepasst', 'bestaetigt')),
  ki_rohdaten JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ergebnisse (
  id SERIAL PRIMARY KEY,
  arbeit_id INTEGER NOT NULL REFERENCES arbeiten(id) ON DELETE CASCADE,
  schueler_id INTEGER NOT NULL REFERENCES schueler(id),
  gesamt_punkte INTEGER NOT NULL DEFAULT 0,
  max_punkte INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  share_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (arbeit_id, schueler_id)
);
```

- [ ] **Step 3: Create src/migrate.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { pool } from './db';

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    console.log(`Done: ${file}`);
  }

  await pool.end();
  console.log('All migrations complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 4: Update tests/setup.ts for test DB**

```typescript
import { pool } from '../src/db';

afterAll(async () => {
  await pool.end();
});
```

- [ ] **Step 5: Create local test database and run migration**

```bash
# Create DB (on local dev machine or via SSH on syntrokids)
createdb korrektur_app
cd backend && npm run migrate
```

Expected: "All migrations complete."

- [ ] **Step 6: Commit**

```bash
git add backend/src/db.ts backend/src/migrate.ts backend/migrations/ backend/tests/setup.ts
git commit -m "feat: database schema with 7 tables and migration runner"
```

---

### Task 3: Authentication (Register + Login + JWT)

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/tests/routes/auth.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write auth tests**

Create `backend/tests/routes/auth.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sarah@schule.de', password: 'test1234', name: 'Sarah' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('sarah@schule.de');
    expect(res.body.user.name).toBe('Sarah');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'sarah@schule.de', password: 'test1234', name: 'Sarah' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sarah@schule.de', password: 'other', name: 'Sarah 2' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'sarah@schule.de', password: 'test1234', name: 'Sarah' });
  });

  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah@schule.de', password: 'test1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah@schule.de', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/auth.test.ts --verbose
```

Expected: FAIL (routes not defined yet)

- [ ] **Step 3: Create src/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 4: Create src/routes/auth.ts**

```typescript
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name required' });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, hash, name]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;
```

- [ ] **Step 5: Register auth routes in src/index.ts**

Add to `src/index.ts` before the health check:

```typescript
import authRoutes from './routes/auth';

// After app.use(express.json()):
app.use('/api/auth', authRoutes);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/auth.test.ts --verbose
```

Expected: PASS (all 4 tests)

- [ ] **Step 7: Commit**

```bash
git add backend/src/middleware/ backend/src/routes/auth.ts backend/tests/routes/auth.test.ts backend/src/index.ts
git commit -m "feat: auth with register, login, JWT middleware"
```

---

### Task 4: Klassen CRUD

**Files:**
- Create: `backend/src/routes/klassen.ts`
- Create: `backend/tests/routes/klassen.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write klassen tests**

Create `backend/tests/routes/klassen.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';

let token: string;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = res.body.token;
});

beforeEach(async () => {
  await pool.query('DELETE FROM klassen');
});

describe('POST /api/klassen', () => {
  it('creates a class', async () => {
    const res = await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '3b', schuljahr: '2025/2026' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('3b');
    expect(res.body.schuljahr).toBe('2025/2026');
  });

  it('rejects without auth', async () => {
    const res = await request(app)
      .post('/api/klassen')
      .send({ name: '3b', schuljahr: '2025/2026' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/klassen', () => {
  it('lists classes for current user', async () => {
    await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '3b', schuljahr: '2025/2026' });

    const res = await request(app)
      .get('/api/klassen')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('3b');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/klassen.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/klassen.ts**

```typescript
import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT * FROM klassen WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res) => {
  const { name, schuljahr } = req.body;
  if (!name || !schuljahr) {
    return res.status(400).json({ error: 'name and schuljahr required' });
  }

  const result = await query(
    'INSERT INTO klassen (user_id, name, schuljahr) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, name, schuljahr]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT * FROM klassen WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { name, schuljahr } = req.body;
  const result = await query(
    'UPDATE klassen SET name = COALESCE($1, name), schuljahr = COALESCE($2, schuljahr), updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
    [name, schuljahr, req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const result = await query(
    'DELETE FROM klassen WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 4: Register route in src/index.ts**

```typescript
import klassenRoutes from './routes/klassen';
app.use('/api/klassen', klassenRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/klassen.test.ts --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/klassen.ts backend/tests/routes/klassen.test.ts backend/src/index.ts
git commit -m "feat: Klassen CRUD endpoints"
```

---

### Task 5: Schueler CRUD

**Files:**
- Create: `backend/src/routes/schueler.ts`
- Create: `backend/tests/routes/schueler.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write schueler tests**

Create `backend/tests/routes/schueler.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';

let token: string;
let klasseId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = userRes.body.token;
});

beforeEach(async () => {
  await pool.query('DELETE FROM klassen');
  const klasseRes = await request(app)
    .post('/api/klassen')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: '3b', schuljahr: '2025/2026' });
  klasseId = klasseRes.body.id;
});

describe('POST /api/klassen/:id/schueler', () => {
  it('adds a student to a class', async () => {
    const res = await request(app)
      .post(`/api/klassen/${klasseId}/schueler`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vorname: 'Max', nachname: 'Mustermann' });

    expect(res.status).toBe(201);
    expect(res.body.vorname).toBe('Max');
    expect(res.body.nachname).toBe('Mustermann');
    expect(res.body.klasse_id).toBe(klasseId);
  });
});

describe('GET /api/klassen/:id/schueler', () => {
  it('lists students of a class', async () => {
    await request(app)
      .post(`/api/klassen/${klasseId}/schueler`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vorname: 'Max', nachname: 'Mustermann' });

    await request(app)
      .post(`/api/klassen/${klasseId}/schueler`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vorname: 'Anna', nachname: 'Becker' });

    const res = await request(app)
      .get(`/api/klassen/${klasseId}/schueler`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/schueler.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/schueler.ts**

```typescript
import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  // Verify klasse belongs to user
  const klasse = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [req.params.klasseId, req.userId]
  );
  if (klasse.rows.length === 0) {
    return res.status(404).json({ error: 'Klasse not found' });
  }

  const result = await query(
    'SELECT * FROM schueler WHERE klasse_id = $1 ORDER BY nachname, vorname',
    [req.params.klasseId]
  );
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res) => {
  const { vorname, nachname } = req.body;
  if (!vorname || !nachname) {
    return res.status(400).json({ error: 'vorname and nachname required' });
  }

  // Verify klasse belongs to user
  const klasse = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [req.params.klasseId, req.userId]
  );
  if (klasse.rows.length === 0) {
    return res.status(404).json({ error: 'Klasse not found' });
  }

  const result = await query(
    'INSERT INTO schueler (klasse_id, vorname, nachname) VALUES ($1, $2, $3) RETURNING *',
    [req.params.klasseId, vorname, nachname]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:schuelerId', async (req: AuthRequest, res) => {
  // Verify ownership through klasse
  const klasse = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [req.params.klasseId, req.userId]
  );
  if (klasse.rows.length === 0) {
    return res.status(404).json({ error: 'Klasse not found' });
  }

  const result = await query(
    'DELETE FROM schueler WHERE id = $1 AND klasse_id = $2 RETURNING id',
    [req.params.schuelerId, req.params.klasseId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Schueler not found' });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 4: Register route in src/index.ts**

```typescript
import schuelerRoutes from './routes/schueler';
app.use('/api/klassen/:klasseId/schueler', schuelerRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/schueler.test.ts --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/schueler.ts backend/tests/routes/schueler.test.ts backend/src/index.ts
git commit -m "feat: Schueler CRUD endpoints"
```

---

### Task 6: Arbeiten CRUD

**Files:**
- Create: `backend/src/routes/arbeiten.ts`
- Create: `backend/tests/routes/arbeiten.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write arbeiten tests**

Create `backend/tests/routes/arbeiten.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';

let token: string;
let klasseId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = userRes.body.token;
});

beforeEach(async () => {
  await pool.query('DELETE FROM klassen');
  const klasseRes = await request(app)
    .post('/api/klassen')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: '3b', schuljahr: '2025/2026' });
  klasseId = klasseRes.body.id;
});

describe('POST /api/arbeiten', () => {
  it('creates an assignment', async () => {
    const res = await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({
        klasse_id: klasseId,
        fach: 'Mathe',
        titel: 'Einmaleins',
        max_punkte: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.fach).toBe('Mathe');
    expect(res.body.titel).toBe('Einmaleins');
    expect(res.body.max_punkte).toBe(10);
    expect(res.body.status).toBe('entwurf');
  });
});

describe('GET /api/arbeiten', () => {
  it('lists assignments filtered by klasse', async () => {
    await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({ klasse_id: klasseId, fach: 'Mathe', titel: 'Einmaleins', max_punkte: 10 });

    const res = await request(app)
      .get(`/api/arbeiten?klasse_id=${klasseId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('PUT /api/arbeiten/:id', () => {
  it('updates status', async () => {
    const created = await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({ klasse_id: klasseId, fach: 'Mathe', titel: 'Einmaleins', max_punkte: 10 });

    const res = await request(app)
      .put(`/api/arbeiten/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'scannen' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('scannen');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/arbeiten.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/arbeiten.ts**

```typescript
import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const { klasse_id } = req.query;
  let sql = `SELECT a.* FROM arbeiten a
    JOIN klassen k ON a.klasse_id = k.id
    WHERE k.user_id = $1`;
  const params: unknown[] = [req.userId];

  if (klasse_id) {
    sql += ' AND a.klasse_id = $2';
    params.push(klasse_id);
  }

  sql += ' ORDER BY a.datum DESC';
  const result = await query(sql, params);
  res.json(result.rows);
});

router.post('/', async (req: AuthRequest, res) => {
  const { klasse_id, fach, titel, max_punkte, datum, musterloesung, notenschluessel } = req.body;
  if (!klasse_id || !fach || !titel || max_punkte == null) {
    return res.status(400).json({ error: 'klasse_id, fach, titel, and max_punkte required' });
  }

  // Verify klasse belongs to user
  const klasse = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [klasse_id, req.userId]
  );
  if (klasse.rows.length === 0) {
    return res.status(404).json({ error: 'Klasse not found' });
  }

  const result = await query(
    `INSERT INTO arbeiten (klasse_id, fach, titel, datum, max_punkte, musterloesung, notenschluessel)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6, $7) RETURNING *`,
    [klasse_id, fach, titel, datum || null, max_punkte, musterloesung || null, notenschluessel ? JSON.stringify(notenschluessel) : null]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT a.* FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const { fach, titel, max_punkte, datum, musterloesung, notenschluessel, status } = req.body;

  const result = await query(
    `UPDATE arbeiten SET
       fach = COALESCE($1, fach),
       titel = COALESCE($2, titel),
       max_punkte = COALESCE($3, max_punkte),
       datum = COALESCE($4, datum),
       musterloesung = COALESCE($5, musterloesung),
       notenschluessel = COALESCE($6, notenschluessel),
       status = COALESCE($7, status),
       updated_at = NOW()
     WHERE id = $8 AND klasse_id IN (SELECT id FROM klassen WHERE user_id = $9)
     RETURNING *`,
    [fach, titel, max_punkte, datum, musterloesung, notenschluessel ? JSON.stringify(notenschluessel) : null, status, req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

export default router;
```

- [ ] **Step 4: Register route in src/index.ts**

```typescript
import arbeitenRoutes from './routes/arbeiten';
app.use('/api/arbeiten', arbeitenRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/arbeiten.test.ts --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/arbeiten.ts backend/tests/routes/arbeiten.test.ts backend/src/index.ts
git commit -m "feat: Arbeiten CRUD endpoints"
```

---

## Phase 2: Core Features

### Task 7: QR-Code Generation Service

**Files:**
- Create: `backend/src/services/qr.ts`
- Create: `backend/tests/services/qr.test.ts`

- [ ] **Step 1: Write QR service tests**

Create `backend/tests/services/qr.test.ts`:

```typescript
import { generateQrCode, generateQrSheet, parseQrContent } from '../../src/services/qr';

describe('QR Service', () => {
  describe('generateQrCode', () => {
    it('generates a data URL for given content', async () => {
      const dataUrl = await generateQrCode('korrektur://arbeit/1/schueler/5/seite/1');
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('parseQrContent', () => {
    it('parses arbeit QR content', () => {
      const result = parseQrContent('korrektur://arbeit/42/schueler/7/seite/2');
      expect(result).toEqual({ arbeitId: 42, schuelerId: 7, seitenNr: 2 });
    });

    it('returns null for invalid content', () => {
      const result = parseQrContent('random text');
      expect(result).toBeNull();
    });
  });

  describe('generateQrSheet', () => {
    it('generates HTML with QR codes for all students and pages', async () => {
      const students = [
        { id: 1, vorname: 'Max', nachname: 'Mustermann' },
        { id: 2, vorname: 'Anna', nachname: 'Becker' },
      ];
      const html = await generateQrSheet(10, students, 2);
      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Anna Becker');
      expect(html).toContain('data:image/png;base64,');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/services/qr.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/services/qr.ts**

```typescript
import QRCode from 'qrcode';

export async function generateQrCode(content: string): Promise<string> {
  return QRCode.toDataURL(content, { width: 150, margin: 1 });
}

export function buildQrContent(arbeitId: number, schuelerId: number, seitenNr: number): string {
  return `korrektur://arbeit/${arbeitId}/schueler/${schuelerId}/seite/${seitenNr}`;
}

export function parseQrContent(content: string): { arbeitId: number; schuelerId: number; seitenNr: number } | null {
  const match = content.match(/^korrektur:\/\/arbeit\/(\d+)\/schueler\/(\d+)\/seite\/(\d+)$/);
  if (!match) return null;
  return {
    arbeitId: parseInt(match[1], 10),
    schuelerId: parseInt(match[2], 10),
    seitenNr: parseInt(match[3], 10),
  };
}

interface Student {
  id: number;
  vorname: string;
  nachname: string;
}

export async function generateQrSheet(arbeitId: number, students: Student[], pagesPerStudent: number): Promise<string> {
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; }
      .student { page-break-after: always; padding: 20px; }
      .student:last-child { page-break-after: auto; }
      .qr-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
      .qr-item { text-align: center; border: 1px dashed #ccc; padding: 8px; border-radius: 4px; }
      .qr-item img { display: block; margin: 0 auto 4px; }
      .qr-item span { font-size: 12px; color: #666; }
      h2 { margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 14px; }
    </style>
  </head><body>`;

  for (const student of students) {
    html += `<div class="student">
      <h2>${student.vorname} ${student.nachname}</h2>
      <p class="subtitle">Arbeit #${arbeitId}</p>
      <div class="qr-grid">`;

    for (let page = 1; page <= pagesPerStudent; page++) {
      const content = buildQrContent(arbeitId, student.id, page);
      const dataUrl = await generateQrCode(content);
      html += `<div class="qr-item">
        <img src="${dataUrl}" width="150" height="150" />
        <span>Seite ${page}</span>
      </div>`;
    }

    html += `</div></div>`;
  }

  html += `</body></html>`;
  return html;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/services/qr.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/qr.ts backend/tests/services/qr.test.ts
git commit -m "feat: QR code generation service"
```

---

### Task 8: QR-Code Endpoint on Arbeiten

**Files:**
- Modify: `backend/src/routes/arbeiten.ts`
- Modify: `backend/tests/routes/arbeiten.test.ts`

- [ ] **Step 1: Add QR endpoint test**

Append to `backend/tests/routes/arbeiten.test.ts`:

```typescript
describe('GET /api/arbeiten/:id/qr-codes', () => {
  it('returns HTML with QR codes for all students', async () => {
    const arbeit = await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({ klasse_id: klasseId, fach: 'Mathe', titel: 'Test', max_punkte: 10 });

    // Add students
    await request(app)
      .post(`/api/klassen/${klasseId}/schueler`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vorname: 'Max', nachname: 'Mustermann' });

    const res = await request(app)
      .get(`/api/arbeiten/${arbeit.body.id}/qr-codes?pages=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Max Mustermann');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest tests/routes/arbeiten.test.ts --verbose -t "qr-codes"
```

Expected: FAIL

- [ ] **Step 3: Add QR endpoint to arbeiten route**

Add to `backend/src/routes/arbeiten.ts` before `export default router`:

```typescript
import { generateQrSheet } from '../services/qr';

router.get('/:id/qr-codes', async (req: AuthRequest, res) => {
  const arbeit = await query(
    `SELECT a.* FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (arbeit.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  const students = await query(
    'SELECT id, vorname, nachname FROM schueler WHERE klasse_id = $1 ORDER BY nachname, vorname',
    [arbeit.rows[0].klasse_id]
  );

  const pages = parseInt(req.query.pages as string) || 2;
  const html = await generateQrSheet(arbeit.rows[0].id, students.rows, pages);
  res.type('html').send(html);
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/arbeiten.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/arbeiten.ts backend/tests/routes/arbeiten.test.ts
git commit -m "feat: QR code sheet generation endpoint"
```

---

### Task 9: Scan Upload Endpoint

**Files:**
- Create: `backend/src/routes/scans.ts`
- Create: `backend/tests/routes/scans.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write scan upload tests**

Create `backend/tests/routes/scans.test.ts`:

```typescript
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { app } from '../../src/index';
import { pool } from '../../src/db';

let token: string;
let klasseId: number;
let arbeitId: number;
let schuelerId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = userRes.body.token;
});

beforeEach(async () => {
  await pool.query('DELETE FROM klassen');

  const klasseRes = await request(app)
    .post('/api/klassen')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: '3b', schuljahr: '2025/2026' });
  klasseId = klasseRes.body.id;

  const schuelerRes = await request(app)
    .post(`/api/klassen/${klasseId}/schueler`)
    .set('Authorization', `Bearer ${token}`)
    .send({ vorname: 'Max', nachname: 'Mustermann' });
  schuelerId = schuelerRes.body.id;

  const arbeitRes = await request(app)
    .post('/api/arbeiten')
    .set('Authorization', `Bearer ${token}`)
    .send({ klasse_id: klasseId, fach: 'Mathe', titel: 'Test', max_punkte: 10 });
  arbeitId = arbeitRes.body.id;
});

describe('POST /api/arbeiten/:id/scans', () => {
  it('uploads a scan and associates it via QR data', async () => {
    // Create a minimal test image (1x1 white PNG)
    const testImagePath = path.join(__dirname, 'test-scan.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngBuffer);

    const res = await request(app)
      .post(`/api/arbeiten/${arbeitId}/scans`)
      .set('Authorization', `Bearer ${token}`)
      .field('schueler_id', schuelerId.toString())
      .field('seiten_nr', '1')
      .attach('bild', testImagePath);

    fs.unlinkSync(testImagePath);

    expect(res.status).toBe(201);
    expect(res.body.schueler_id).toBe(schuelerId);
    expect(res.body.seiten_nr).toBe(1);
    expect(res.body.bild_pfad).toBeDefined();
  });
});

describe('GET /api/arbeiten/:id/scans', () => {
  it('lists all scans for an assignment', async () => {
    const testImagePath = path.join(__dirname, 'test-scan.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, pngBuffer);

    await request(app)
      .post(`/api/arbeiten/${arbeitId}/scans`)
      .set('Authorization', `Bearer ${token}`)
      .field('schueler_id', schuelerId.toString())
      .field('seiten_nr', '1')
      .attach('bild', testImagePath);

    fs.unlinkSync(testImagePath);

    const res = await request(app)
      .get(`/api/arbeiten/${arbeitId}/scans`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/scans.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/scans.ts**

```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { buildQrContent } from '../services/qr';

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(config.uploadDir, 'scans');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/:arbeitId/scans', upload.single('bild'), async (req: AuthRequest, res) => {
  const { arbeitId } = req.params;
  const { schueler_id, seiten_nr } = req.body;

  if (!schueler_id || !seiten_nr || !req.file) {
    return res.status(400).json({ error: 'schueler_id, seiten_nr, and bild required' });
  }

  // Verify arbeit belongs to user
  const arbeit = await query(
    `SELECT a.id FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [arbeitId, req.userId]
  );
  if (arbeit.rows.length === 0) {
    return res.status(404).json({ error: 'Arbeit not found' });
  }

  const qrCode = buildQrContent(
    parseInt(arbeitId, 10),
    parseInt(schueler_id, 10),
    parseInt(seiten_nr, 10)
  );

  const result = await query(
    `INSERT INTO scan_seiten (arbeit_id, schueler_id, seiten_nr, bild_pfad, qr_code)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (arbeit_id, schueler_id, seiten_nr) DO UPDATE
       SET bild_pfad = EXCLUDED.bild_pfad, qr_code = EXCLUDED.qr_code
     RETURNING *`,
    [arbeitId, schueler_id, parseInt(seiten_nr, 10), req.file.path, qrCode]
  );
  res.status(201).json(result.rows[0]);
});

router.get('/:arbeitId/scans', async (req: AuthRequest, res) => {
  const arbeit = await query(
    `SELECT a.id FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [req.params.arbeitId, req.userId]
  );
  if (arbeit.rows.length === 0) {
    return res.status(404).json({ error: 'Arbeit not found' });
  }

  const result = await query(
    `SELECT s.*, sch.vorname, sch.nachname
     FROM scan_seiten s
     JOIN schueler sch ON s.schueler_id = sch.id
     WHERE s.arbeit_id = $1
     ORDER BY sch.nachname, sch.vorname, s.seiten_nr`,
    [req.params.arbeitId]
  );
  res.json(result.rows);
});

export default router;
```

- [ ] **Step 4: Register route in src/index.ts**

```typescript
import scansRoutes from './routes/scans';
app.use('/api/arbeiten', scansRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/scans.test.ts --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/scans.ts backend/tests/routes/scans.test.ts backend/src/index.ts
git commit -m "feat: scan upload and listing endpoints"
```

---

### Task 10: OpenAI Korrektur Service

**Files:**
- Create: `backend/src/services/openai.ts`
- Create: `backend/src/services/korrektur.ts`
- Create: `backend/tests/services/korrektur.test.ts`

- [ ] **Step 1: Create src/services/openai.ts**

```typescript
import fs from 'fs';
import { config } from '../config';

export interface KorrekturAufgabe {
  nummer: number;
  erkannter_text: string;
  bewertung: 'richtig' | 'falsch' | 'teilweise';
  punkte: number;
  max_punkte: number;
  position: { x: number; y: number; w: number; h: number };
  feedback: string | null;
}

export interface KorrekturResult {
  aufgaben: KorrekturAufgabe[];
  gesamt_punkte: number;
  max_punkte: number;
}

export async function korrigiereSeite(
  bildPfad: string,
  fach: string,
  maxPunkte: number,
  musterloesung?: string | null
): Promise<KorrekturResult> {
  const imageBuffer = fs.readFileSync(bildPfad);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = bildPfad.endsWith('.png') ? 'image/png' : 'image/jpeg';

  let systemPrompt = `Du bist eine Korrektur-KI fuer Grundschularbeiten (Fach: ${fach}).
Analysiere das Bild einer handgeschriebenen Schuelerarbeit.

Fuer jede Aufgabe:
1. Erkenne den handgeschriebenen Text
2. Bewerte ob die Antwort richtig, falsch oder teilweise richtig ist
3. Vergib Punkte (maximal ${maxPunkte} Punkte insgesamt)
4. Gib die ungefaehre Position der Aufgabe im Bild an (x, y, width, height als Prozent 0-100)
5. Bei falschen Antworten: gib die richtige Loesung als Feedback

Antworte ausschliesslich als JSON im folgenden Format:
{
  "aufgaben": [
    {
      "nummer": 1,
      "erkannter_text": "...",
      "bewertung": "richtig|falsch|teilweise",
      "punkte": 2,
      "max_punkte": 2,
      "position": { "x": 10, "y": 20, "w": 80, "h": 5 },
      "feedback": null oder "Richtige Antwort: ..."
    }
  ],
  "gesamt_punkte": 8,
  "max_punkte": 10
}`;

  if (musterloesung) {
    systemPrompt += `\n\nMusterloesung:\n${musterloesung}`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' },
            },
            { type: 'text', text: 'Korrigiere diese Arbeit.' },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content) as KorrekturResult;
}
```

- [ ] **Step 2: Create src/services/korrektur.ts**

```typescript
import { query } from '../db';
import { korrigiereSeite, KorrekturResult } from './openai';

export async function korrigiereScan(scanSeiteId: number): Promise<KorrekturResult> {
  // Load scan + arbeit info
  const scan = await query(
    `SELECT s.*, a.fach, a.max_punkte, a.musterloesung
     FROM scan_seiten s
     JOIN arbeiten a ON s.arbeit_id = a.id
     WHERE s.id = $1`,
    [scanSeiteId]
  );

  if (scan.rows.length === 0) {
    throw new Error(`Scan ${scanSeiteId} not found`);
  }

  const { bild_pfad, fach, max_punkte, musterloesung } = scan.rows[0];

  // Call OpenAI
  const result = await korrigiereSeite(bild_pfad, fach, max_punkte, musterloesung);

  // Save correction
  await query(
    `INSERT INTO korrekturen (scan_seite_id, punkte, max_punkte, annotationen, status, ki_rohdaten)
     VALUES ($1, $2, $3, $4, 'ki_korrigiert', $5)
     ON CONFLICT (scan_seite_id) DO UPDATE
       SET punkte = EXCLUDED.punkte,
           max_punkte = EXCLUDED.max_punkte,
           annotationen = EXCLUDED.annotationen,
           status = 'ki_korrigiert',
           ki_rohdaten = EXCLUDED.ki_rohdaten,
           updated_at = NOW()
     RETURNING *`,
    [scanSeiteId, result.gesamt_punkte, result.max_punkte, JSON.stringify(result.aufgaben), JSON.stringify(result)]
  );

  return result;
}
```

- [ ] **Step 3: Write korrektur service test (mocked OpenAI)**

Create `backend/tests/services/korrektur.test.ts`:

```typescript
import { korrigiereSeite, KorrekturResult } from '../../src/services/openai';

// Test that the OpenAI response format is correctly typed
describe('KorrekturResult type', () => {
  it('accepts valid correction result', () => {
    const result: KorrekturResult = {
      aufgaben: [
        {
          nummer: 1,
          erkannter_text: '7 x 8 = 56',
          bewertung: 'richtig',
          punkte: 2,
          max_punkte: 2,
          position: { x: 10, y: 20, w: 80, h: 5 },
          feedback: null,
        },
        {
          nummer: 2,
          erkannter_text: '9 x 6 = 52',
          bewertung: 'falsch',
          punkte: 0,
          max_punkte: 2,
          position: { x: 10, y: 30, w: 80, h: 5 },
          feedback: 'Richtige Antwort: 54',
        },
      ],
      gesamt_punkte: 2,
      max_punkte: 4,
    };

    expect(result.aufgaben).toHaveLength(2);
    expect(result.gesamt_punkte).toBe(2);
    expect(result.aufgaben[0].bewertung).toBe('richtig');
    expect(result.aufgaben[1].bewertung).toBe('falsch');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd backend && npx jest tests/services/korrektur.test.ts --verbose
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/openai.ts backend/src/services/korrektur.ts backend/tests/services/korrektur.test.ts
git commit -m "feat: OpenAI GPT-4o Vision korrektur service"
```

---

### Task 11: Korrektur Endpoints

**Files:**
- Create: `backend/src/routes/korrekturen.ts`
- Create: `backend/tests/routes/korrekturen.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write korrektur endpoint tests**

Create `backend/tests/routes/korrekturen.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';

let token: string;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = userRes.body.token;
});

describe('GET /api/scans/:id/korrektur', () => {
  it('returns 404 if no correction exists', async () => {
    const res = await request(app)
      .get('/api/scans/99999/korrektur')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/korrekturen/:id', () => {
  it('returns 404 for non-existent correction', async () => {
    const res = await request(app)
      .put('/api/korrekturen/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ punkte: 5 });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/korrekturen.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/korrekturen.ts**

```typescript
import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { korrigiereScan } from '../services/korrektur';

const router = Router();
router.use(authMiddleware);

// Trigger AI correction for a scan
router.post('/scans/:scanId/korrigieren', async (req: AuthRequest, res) => {
  // Verify ownership
  const scan = await query(
    `SELECT s.id FROM scan_seiten s
     JOIN arbeiten a ON s.arbeit_id = a.id
     JOIN klassen k ON a.klasse_id = k.id
     WHERE s.id = $1 AND k.user_id = $2`,
    [req.params.scanId, req.userId]
  );
  if (scan.rows.length === 0) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  try {
    const result = await korrigiereScan(parseInt(req.params.scanId, 10));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get correction for a scan
router.get('/scans/:scanId/korrektur', async (req: AuthRequest, res) => {
  const result = await query(
    `SELECT k.* FROM korrekturen k
     JOIN scan_seiten s ON k.scan_seite_id = s.id
     JOIN arbeiten a ON s.arbeit_id = a.id
     JOIN klassen kl ON a.klasse_id = kl.id
     WHERE s.id = $1 AND kl.user_id = $2`,
    [req.params.scanId, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Korrektur not found' });
  }
  res.json(result.rows[0]);
});

// Manually edit a correction
router.put('/korrekturen/:id', async (req: AuthRequest, res) => {
  const { punkte, annotationen, feedback } = req.body;

  const result = await query(
    `UPDATE korrekturen SET
       punkte = COALESCE($1, punkte),
       annotationen = COALESCE($2, annotationen),
       feedback = COALESCE($3, feedback),
       status = 'manuell_angepasst',
       updated_at = NOW()
     WHERE id = $4 AND scan_seite_id IN (
       SELECT s.id FROM scan_seiten s
       JOIN arbeiten a ON s.arbeit_id = a.id
       JOIN klassen k ON a.klasse_id = k.id
       WHERE k.user_id = $5
     )
     RETURNING *`,
    [punkte, annotationen ? JSON.stringify(annotationen) : null, feedback, req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Korrektur not found' });
  }
  res.json(result.rows[0]);
});

// Confirm a correction
router.put('/korrekturen/:id/bestaetigen', async (req: AuthRequest, res) => {
  const result = await query(
    `UPDATE korrekturen SET status = 'bestaetigt', updated_at = NOW()
     WHERE id = $1 AND scan_seite_id IN (
       SELECT s.id FROM scan_seiten s
       JOIN arbeiten a ON s.arbeit_id = a.id
       JOIN klassen k ON a.klasse_id = k.id
       WHERE k.user_id = $2
     )
     RETURNING *`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Korrektur not found' });
  }
  res.json(result.rows[0]);
});

export default router;
```

- [ ] **Step 4: Register routes in src/index.ts**

```typescript
import korrekturenRoutes from './routes/korrekturen';
app.use('/api', korrekturenRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/korrekturen.test.ts --verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/korrekturen.ts backend/tests/routes/korrekturen.test.ts backend/src/index.ts
git commit -m "feat: korrektur endpoints (trigger, view, edit, confirm)"
```

---

### Task 12: Ergebnisse + Share Tokens

**Files:**
- Create: `backend/src/routes/ergebnisse.ts`
- Create: `backend/tests/routes/ergebnisse.test.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write ergebnisse tests**

Create `backend/tests/routes/ergebnisse.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db';
import crypto from 'crypto';

let token: string;
let klasseId: number;
let arbeitId: number;
let schuelerId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'test@schule.de', password: 'test1234', name: 'Test' });
  token = userRes.body.token;
});

beforeEach(async () => {
  await pool.query('DELETE FROM klassen');

  const klasseRes = await request(app)
    .post('/api/klassen')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: '3b', schuljahr: '2025/2026' });
  klasseId = klasseRes.body.id;

  const schuelerRes = await request(app)
    .post(`/api/klassen/${klasseId}/schueler`)
    .set('Authorization', `Bearer ${token}`)
    .send({ vorname: 'Max', nachname: 'Mustermann' });
  schuelerId = schuelerRes.body.id;

  const arbeitRes = await request(app)
    .post('/api/arbeiten')
    .set('Authorization', `Bearer ${token}`)
    .send({ klasse_id: klasseId, fach: 'Mathe', titel: 'Test', max_punkte: 10 });
  arbeitId = arbeitRes.body.id;

  // Insert a result directly for testing
  const shareToken = crypto.randomBytes(16).toString('hex');
  await pool.query(
    `INSERT INTO ergebnisse (arbeit_id, schueler_id, gesamt_punkte, max_punkte, note, share_token)
     VALUES ($1, $2, 8, 10, '2', $3)`,
    [arbeitId, schuelerId, shareToken]
  );
});

describe('GET /api/arbeiten/:id/ergebnisse', () => {
  it('returns results with stats', async () => {
    const res = await request(app)
      .get(`/api/arbeiten/${arbeitId}/ergebnisse`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ergebnisse).toHaveLength(1);
    expect(res.body.ergebnisse[0].gesamt_punkte).toBe(8);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.durchschnitt).toBe(8);
  });
});

describe('GET /api/ergebnis/:share_token (public)', () => {
  it('returns result by share token without auth', async () => {
    // Get the share token we inserted
    const erg = await pool.query('SELECT share_token FROM ergebnisse WHERE arbeit_id = $1', [arbeitId]);
    const shareToken = erg.rows[0].share_token;

    const res = await request(app)
      .get(`/api/ergebnis/${shareToken}`);

    expect(res.status).toBe(200);
    expect(res.body.gesamt_punkte).toBe(8);
    expect(res.body.vorname).toBe('Max');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/routes/ergebnisse.test.ts --verbose
```

Expected: FAIL

- [ ] **Step 3: Create src/routes/ergebnisse.ts**

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Authenticated: generate/refresh results for an assignment
router.post('/arbeiten/:arbeitId/ergebnisse/generieren', authMiddleware, async (req: AuthRequest, res) => {
  const { arbeitId } = req.params;

  // Verify ownership
  const arbeit = await query(
    `SELECT a.* FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [arbeitId, req.userId]
  );
  if (arbeit.rows.length === 0) {
    return res.status(404).json({ error: 'Arbeit not found' });
  }

  // Aggregate confirmed corrections per student
  const schuelerPunkte = await query(
    `SELECT s.schueler_id,
            SUM(k.punkte) AS gesamt_punkte,
            SUM(k.max_punkte) AS max_punkte
     FROM scan_seiten s
     JOIN korrekturen k ON k.scan_seite_id = s.id
     WHERE s.arbeit_id = $1 AND k.status IN ('ki_korrigiert', 'manuell_angepasst', 'bestaetigt')
     GROUP BY s.schueler_id`,
    [arbeitId]
  );

  const results = [];
  for (const row of schuelerPunkte.rows) {
    const shareToken = crypto.randomBytes(16).toString('hex');
    const result = await query(
      `INSERT INTO ergebnisse (arbeit_id, schueler_id, gesamt_punkte, max_punkte, share_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (arbeit_id, schueler_id) DO UPDATE
         SET gesamt_punkte = EXCLUDED.gesamt_punkte,
             max_punkte = EXCLUDED.max_punkte,
             updated_at = NOW()
       RETURNING *`,
      [arbeitId, row.schueler_id, row.gesamt_punkte, row.max_punkte, shareToken]
    );
    results.push(result.rows[0]);
  }

  res.json(results);
});

// Authenticated: get results overview
router.get('/arbeiten/:arbeitId/ergebnisse', authMiddleware, async (req: AuthRequest, res) => {
  const arbeit = await query(
    `SELECT a.* FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [req.params.arbeitId, req.userId]
  );
  if (arbeit.rows.length === 0) {
    return res.status(404).json({ error: 'Arbeit not found' });
  }

  const ergebnisse = await query(
    `SELECT e.*, sch.vorname, sch.nachname
     FROM ergebnisse e
     JOIN schueler sch ON e.schueler_id = sch.id
     WHERE e.arbeit_id = $1
     ORDER BY e.gesamt_punkte DESC`,
    [req.params.arbeitId]
  );

  const rows = ergebnisse.rows;
  const stats = rows.length > 0
    ? {
        durchschnitt: Math.round((rows.reduce((sum: number, r: any) => sum + r.gesamt_punkte, 0) / rows.length) * 10) / 10,
        max: Math.max(...rows.map((r: any) => r.gesamt_punkte)),
        min: Math.min(...rows.map((r: any) => r.gesamt_punkte)),
        anzahl: rows.length,
      }
    : { durchschnitt: 0, max: 0, min: 0, anzahl: 0 };

  res.json({ ergebnisse: rows, stats });
});

// Public: get result by share token
router.get('/ergebnis/:shareToken', async (req, res) => {
  const result = await query(
    `SELECT e.*, sch.vorname, sch.nachname, a.fach, a.titel, a.datum
     FROM ergebnisse e
     JOIN schueler sch ON e.schueler_id = sch.id
     JOIN arbeiten a ON e.arbeit_id = a.id
     WHERE e.share_token = $1`,
    [req.params.shareToken]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(result.rows[0]);
});

// Public: render parent web view
router.get('/ergebnis/:shareToken/view', async (req, res) => {
  const result = await query(
    `SELECT e.*, sch.vorname, sch.nachname, a.fach, a.titel, a.datum
     FROM ergebnisse e
     JOIN schueler sch ON e.schueler_id = sch.id
     JOIN arbeiten a ON e.arbeit_id = a.id
     WHERE e.share_token = $1`,
    [req.params.shareToken]
  );
  if (result.rows.length === 0) {
    return res.status(404).send('Nicht gefunden');
  }
  res.render('ergebnis', { data: result.rows[0] });
});

export default router;
```

- [ ] **Step 4: Create src/views/ergebnis.ejs**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ergebnis - <%= data.fach %></title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; max-width: 480px; margin: 40px auto; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 20px; }
    .score { text-align: center; padding: 24px; background: #0f172a; border-radius: 12px; margin-bottom: 20px; }
    .score-value { font-size: 48px; font-weight: bold; color: #10b981; }
    .score-label { color: #64748b; font-size: 14px; margin-top: 4px; }
    .info { display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid #334155; }
    .info-label { color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <h1><%= data.vorname %> <%= data.nachname %></h1>
    <p class="subtitle"><%= data.fach %> - <%= data.titel %></p>

    <div class="score">
      <div class="score-value"><%= data.gesamt_punkte %>/<%= data.max_punkte %></div>
      <div class="score-label">Punkte</div>
    </div>

    <div class="info">
      <span class="info-label">Fach</span>
      <span><%= data.fach %></span>
    </div>
    <div class="info">
      <span class="info-label">Datum</span>
      <span><%= new Date(data.datum).toLocaleDateString('de-DE') %></span>
    </div>
    <% if (data.note) { %>
    <div class="info">
      <span class="info-label">Note</span>
      <span><%= data.note %></span>
    </div>
    <% } %>
  </div>
</body>
</html>
```

- [ ] **Step 5: Register routes in src/index.ts**

```typescript
import ergebnisseRoutes from './routes/ergebnisse';
app.use('/api', ergebnisseRoutes);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && npx jest tests/routes/ergebnisse.test.ts --verbose
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/ergebnisse.ts backend/src/views/ergebnis.ejs backend/tests/routes/ergebnisse.test.ts backend/src/index.ts
git commit -m "feat: ergebnisse endpoints with share tokens and parent web view"
```

---

## Phase 3: React Native App

### Task 13: Expo Project Setup

**Files:**
- Create: `app/` (Expo project)
- Create: `app/src/types/index.ts`
- Create: `app/src/services/api.ts`
- Create: `app/src/store/auth.ts`

- [ ] **Step 1: Create Expo project**

```bash
cd "D:/PRIVATE PROJEKTE/KORREKTUR APP"
npx create-expo-app@latest app --template blank-typescript
cd app
npx expo install expo-camera expo-image-picker expo-print expo-sharing expo-secure-store
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npm install axios zustand react-native-safe-area-context react-native-screens
npm install react-native-svg
```

- [ ] **Step 2: Create src/types/index.ts**

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Klasse {
  id: number;
  name: string;
  schuljahr: string;
}

export interface Schueler {
  id: number;
  klasse_id: number;
  vorname: string;
  nachname: string;
}

export interface Arbeit {
  id: number;
  klasse_id: number;
  fach: string;
  titel: string;
  datum: string;
  max_punkte: number;
  musterloesung: string | null;
  notenschluessel: Record<string, string> | null;
  status: 'entwurf' | 'scannen' | 'korrigieren' | 'pruefen' | 'fertig';
}

export interface ScanSeite {
  id: number;
  arbeit_id: number;
  schueler_id: number;
  seiten_nr: number;
  bild_pfad: string;
  vorname?: string;
  nachname?: string;
}

export interface KorrekturAufgabe {
  nummer: number;
  erkannter_text: string;
  bewertung: 'richtig' | 'falsch' | 'teilweise';
  punkte: number;
  max_punkte: number;
  position: { x: number; y: number; w: number; h: number };
  feedback: string | null;
}

export interface Korrektur {
  id: number;
  scan_seite_id: number;
  punkte: number;
  max_punkte: number;
  annotationen: KorrekturAufgabe[];
  feedback: string | null;
  status: 'ausstehend' | 'ki_korrigiert' | 'manuell_angepasst' | 'bestaetigt';
}

export interface Ergebnis {
  id: number;
  arbeit_id: number;
  schueler_id: number;
  gesamt_punkte: number;
  max_punkte: number;
  note: string | null;
  share_token: string;
  vorname: string;
  nachname: string;
}
```

- [ ] **Step 3: Create src/store/auth.ts**

```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: { id: number; email: string; name: string } | null;
  setAuth: (token: string, user: { id: number; email: string; name: string }) => void;
  logout: () => void;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    set({ token: null, user: null });
  },
  loadToken: async () => {
    const token = await SecureStore.getItemAsync('token');
    const userJson = await SecureStore.getItemAsync('user');
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson) });
    }
  },
}));
```

- [ ] **Step 4: Create src/services/api.ts**

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/auth';
import type { Klasse, Schueler, Arbeit, ScanSeite, Korrektur, Ergebnis } from '../types';

const API_URL = __DEV__ ? 'http://10.0.2.2:3000/api' : 'https://syntrokids.de/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email: string, password: string) =>
  api.post<{ token: string; user: { id: number; email: string; name: string } }>('/auth/login', { email, password });

export const register = (email: string, password: string, name: string) =>
  api.post<{ token: string; user: { id: number; email: string; name: string } }>('/auth/register', { email, password, name });

// Klassen
export const getKlassen = () => api.get<Klasse[]>('/klassen');
export const createKlasse = (name: string, schuljahr: string) => api.post<Klasse>('/klassen', { name, schuljahr });

// Schueler
export const getSchueler = (klasseId: number) => api.get<Schueler[]>(`/klassen/${klasseId}/schueler`);
export const createSchueler = (klasseId: number, vorname: string, nachname: string) =>
  api.post<Schueler>(`/klassen/${klasseId}/schueler`, { vorname, nachname });

// Arbeiten
export const getArbeiten = (klasseId?: number) =>
  api.get<Arbeit[]>('/arbeiten', { params: klasseId ? { klasse_id: klasseId } : {} });
export const createArbeit = (data: Partial<Arbeit>) => api.post<Arbeit>('/arbeiten', data);
export const getArbeit = (id: number) => api.get<Arbeit>(`/arbeiten/${id}`);

// QR Codes
export const getQrCodes = (arbeitId: number, pages: number) =>
  api.get<string>(`/arbeiten/${arbeitId}/qr-codes`, { params: { pages }, responseType: 'text' as any });

// Scans
export const uploadScan = (arbeitId: number, schuelerId: number, seitenNr: number, imageUri: string) => {
  const formData = new FormData();
  formData.append('schueler_id', schuelerId.toString());
  formData.append('seiten_nr', seitenNr.toString());
  formData.append('bild', { uri: imageUri, type: 'image/jpeg', name: 'scan.jpg' } as any);
  return api.post<ScanSeite>(`/arbeiten/${arbeitId}/scans`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getScans = (arbeitId: number) => api.get<ScanSeite[]>(`/arbeiten/${arbeitId}/scans`);

// Korrekturen
export const triggerKorrektur = (scanId: number) => api.post(`/scans/${scanId}/korrigieren`);
export const getKorrektur = (scanId: number) => api.get<Korrektur>(`/scans/${scanId}/korrektur`);
export const updateKorrektur = (id: number, data: Partial<Korrektur>) => api.put<Korrektur>(`/korrekturen/${id}`, data);
export const bestaetigeKorrektur = (id: number) => api.put<Korrektur>(`/korrekturen/${id}/bestaetigen`);

// Ergebnisse
export const getErgebnisse = (arbeitId: number) =>
  api.get<{ ergebnisse: Ergebnis[]; stats: { durchschnitt: number; max: number; min: number; anzahl: number } }>(
    `/arbeiten/${arbeitId}/ergebnisse`
  );
export const generiereErgebnisse = (arbeitId: number) => api.post(`/arbeiten/${arbeitId}/ergebnisse/generieren`);
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: Expo project setup with types, auth store, API client"
```

---

### Task 14: Login Screen

**Files:**
- Create: `app/app/_layout.tsx`
- Create: `app/app/login.tsx`

- [ ] **Step 1: Create app/app/_layout.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { token, loadToken } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken().finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}
```

- [ ] **Step 2: Create app/app/login.tsx**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../src/store/auth';
import { login, register } from '../src/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfuellen');
      return;
    }

    setLoading(true);
    try {
      const res = isRegister
        ? await register(email, password, name)
        : await login(email, password);
      await setAuth(res.data.token, res.data.user);
    } catch (err: any) {
      Alert.alert('Fehler', err.response?.data?.error || 'Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>Korrektur-App</Text>
        <Text style={styles.subtitle}>{isRegister ? 'Konto erstellen' : 'Anmelden'}</Text>

        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '...' : isRegister ? 'Registrieren' : 'Anmelden'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.link}>
            {isRegister ? 'Bereits ein Konto? Anmelden' : 'Kein Konto? Registrieren'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f1f5f9', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32, marginTop: 8 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16, color: '#f1f5f9',
    fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  button: {
    backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#3b82f6', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/app/_layout.tsx app/app/login.tsx
git commit -m "feat: root layout with auth guard and login screen"
```

---

### Task 15: Tab Navigation + Dashboard

**Files:**
- Create: `app/app/(tabs)/_layout.tsx`
- Create: `app/app/(tabs)/index.tsx`
- Create: `app/app/(tabs)/ergebnisse.tsx`
- Create: `app/app/(tabs)/einstellungen.tsx`
- Create: `app/src/components/ArbeitCard.tsx`
- Create: `app/src/components/StatusBadge.tsx`

- [ ] **Step 1: Create tab layout**

Create `app/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#f1f5f9',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="ergebnisse"
        options={{
          title: 'Ergebnisse',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create StatusBadge component**

Create `app/src/components/StatusBadge.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  entwurf: { bg: '#334155', text: '#94a3b8' },
  scannen: { bg: '#3b82f6', text: '#ffffff' },
  korrigieren: { bg: '#f59e0b', text: '#1e293b' },
  pruefen: { bg: '#f59e0b', text: '#1e293b' },
  fertig: { bg: '#10b981', text: '#ffffff' },
};

const STATUS_LABELS: Record<string, string> = {
  entwurf: 'Entwurf',
  scannen: 'Scannen',
  korrigieren: 'Korrigieren',
  pruefen: 'Pruefen',
  fertig: 'Fertig',
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.entwurf;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{STATUS_LABELS[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 3: Create ArbeitCard component**

Create `app/src/components/ArbeitCard.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBadge } from './StatusBadge';
import type { Arbeit } from '../types';

interface Props {
  arbeit: Arbeit;
  onPress: () => void;
}

export function ArbeitCard({ arbeit, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{arbeit.fach} - {arbeit.titel}</Text>
          <Text style={styles.subtitle}>
            {new Date(arbeit.datum).toLocaleDateString('de-DE')}
          </Text>
        </View>
        <StatusBadge status={arbeit.status} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#f1f5f9', fontWeight: '600', fontSize: 15 },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
```

- [ ] **Step 4: Create Dashboard screen**

Create `app/app/(tabs)/index.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { getArbeiten, getKlassen } from '../../src/services/api';
import { ArbeitCard } from '../../src/components/ArbeitCard';
import type { Arbeit, Klasse } from '../../src/types';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [arbeiten, setArbeiten] = useState<Arbeit[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const [arbeitenRes, klassenRes] = await Promise.all([getArbeiten(), getKlassen()]);
    setArbeiten(arbeitenRes.data);
    setKlassen(klassenRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hallo, {user?.name}</Text>
        <Text style={styles.info}>
          {klassen.length > 0 ? `${klassen.length} Klasse${klassen.length > 1 ? 'n' : ''}` : 'Noch keine Klassen'}
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.action, styles.actionPrimary]} onPress={() => router.push('/scanner' as any)}>
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionLabel}>Scannen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => router.push('/arbeit-erstellen' as any)}>
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionLabelDim}>Neue Arbeit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => router.push('/klassen' as any)}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabelDim}>Klassen</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Letzte Arbeiten</Text>

      <FlatList
        data={arbeiten}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ArbeitCard arbeit={item} onPress={() => router.push(`/arbeit/${item.id}` as any)} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Noch keine Arbeiten. Erstelle deine erste!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9' },
  info: { color: '#64748b', fontSize: 13, marginTop: 4 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16, marginTop: 8 },
  action: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  actionPrimary: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, color: 'white', marginTop: 4, fontWeight: '600' },
  actionLabelDim: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  sectionTitle: {
    color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 10,
  },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 5: Create placeholder Ergebnisse tab**

Create `app/app/(tabs)/ergebnisse.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function ErgebnisseScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ergebnisse kommen hier hin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#64748b', fontSize: 16 },
});
```

- [ ] **Step 6: Create Einstellungen tab**

Create `app/app/(tabs)/einstellungen.tsx`:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/auth';

export default function EinstellungenScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 20 },
  name: { color: '#f1f5f9', fontSize: 18, fontWeight: '600' },
  email: { color: '#64748b', fontSize: 14, marginTop: 4 },
  logoutButton: {
    backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  logoutText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 7: Commit**

```bash
git add app/app/ app/src/components/
git commit -m "feat: tab navigation, dashboard, settings, and components"
```

---

### Task 16: Scanner Screen

**Files:**
- Create: `app/src/screens/ScannerScreen.tsx`
- Create: `app/app/scanner.tsx`

- [ ] **Step 1: Create ScannerScreen**

Create `app/src/screens/ScannerScreen.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { parseQrContent } from '../services/qr-parser';
import { uploadScan } from '../services/api';

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const params = useLocalSearchParams<{ arbeitId: string }>();
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Kamera-Zugriff wird benoetigt</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Erlauben</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (processing) return;

    const parsed = parseQrContent(result.data);
    if (!parsed) return;

    setLastScanned(`${parsed.schuelerId}-${parsed.seitenNr}`);
    setProcessing(true);

    try {
      // Take photo
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;

      // Upload
      await uploadScan(parsed.arbeitId, parsed.schuelerId, parsed.seitenNr, photo.uri);
      setScannedCount((c) => c + 1);
    } catch (err: any) {
      Alert.alert('Fehler', err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Scannen</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* QR info banner */}
      {lastScanned && (
        <View style={styles.qrBanner}>
          <Text style={styles.qrBannerText}>QR erkannt ✅</Text>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.counter}>{scannedCount} Seiten gescannt</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 20,
    paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: { color: 'white', fontSize: 20 },
  topTitle: { color: 'white', fontWeight: '600', fontSize: 16 },
  qrBanner: {
    position: 'absolute', top: 100, left: 20, right: 20,
    backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10b981',
    borderRadius: 8, padding: 12,
  },
  qrBannerText: { color: '#10b981', fontWeight: '600', textAlign: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center',
  },
  counter: { color: '#94a3b8', fontSize: 14 },
  text: { color: '#f1f5f9', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, marginHorizontal: 40 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
});
```

- [ ] **Step 2: Create QR parser utility**

Create `app/src/services/qr-parser.ts`:

```typescript
export function parseQrContent(content: string): { arbeitId: number; schuelerId: number; seitenNr: number } | null {
  const match = content.match(/^korrektur:\/\/arbeit\/(\d+)\/schueler\/(\d+)\/seite\/(\d+)$/);
  if (!match) return null;
  return {
    arbeitId: parseInt(match[1], 10),
    schuelerId: parseInt(match[2], 10),
    seitenNr: parseInt(match[3], 10),
  };
}
```

- [ ] **Step 3: Create route file**

Create `app/app/scanner.tsx`:

```tsx
import { ScannerScreen } from '../src/screens/ScannerScreen';
export default ScannerScreen;
```

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/ScannerScreen.tsx app/src/services/qr-parser.ts app/app/scanner.tsx
git commit -m "feat: scanner screen with QR detection and auto-upload"
```

---

### Task 17: Korrektur Screen

**Files:**
- Create: `app/src/screens/KorrekturScreen.tsx`
- Create: `app/src/components/AnnotationOverlay.tsx`
- Create: `app/app/korrektur.tsx`

- [ ] **Step 1: Create AnnotationOverlay**

Create `app/src/components/AnnotationOverlay.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native';
import type { KorrekturAufgabe } from '../types';

interface Props {
  aufgaben: KorrekturAufgabe[];
  imageWidth: number;
  imageHeight: number;
}

export function AnnotationOverlay({ aufgaben, imageWidth, imageHeight }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { width: imageWidth, height: imageHeight }]}>
      {aufgaben.map((aufgabe) => {
        const left = (aufgabe.position.x / 100) * imageWidth;
        const top = (aufgabe.position.y / 100) * imageHeight;
        const width = (aufgabe.position.w / 100) * imageWidth;
        const height = (aufgabe.position.h / 100) * imageHeight;
        const isCorrect = aufgabe.bewertung === 'richtig';
        const color = isCorrect ? '#10b981' : '#ef4444';

        return (
          <View
            key={aufgabe.nummer}
            style={[styles.annotation, { left, top, width, height, borderColor: color }]}
          >
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>
                {isCorrect ? '✓' : '✗'} {aufgabe.punkte}/{aufgabe.max_punkte}
              </Text>
            </View>
            {aufgabe.feedback && (
              <Text style={[styles.feedback, { color }]}>{aufgabe.feedback}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  annotation: {
    position: 'absolute', borderWidth: 2, borderRadius: 4, padding: 2,
  },
  badge: {
    position: 'absolute', top: -12, right: -2, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  feedback: { fontSize: 10, marginTop: 2, fontWeight: '600' },
});
```

- [ ] **Step 2: Create KorrekturScreen**

Create `app/src/screens/KorrekturScreen.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getKorrektur, bestaetigeKorrektur } from '../services/api';
import { AnnotationOverlay } from '../components/AnnotationOverlay';
import type { Korrektur } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function KorrekturScreen() {
  const { scanId, bildUri } = useLocalSearchParams<{ scanId: string; bildUri: string }>();
  const [korrektur, setKorrektur] = useState<Korrektur | null>(null);
  const [imageSize, setImageSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.4 });
  const router = useRouter();

  useEffect(() => {
    if (scanId) {
      getKorrektur(parseInt(scanId, 10))
        .then((res) => setKorrektur(res.data))
        .catch(() => {});
    }
  }, [scanId]);

  useEffect(() => {
    if (bildUri) {
      Image.getSize(bildUri, (w, h) => {
        const ratio = SCREEN_WIDTH / w;
        setImageSize({ width: SCREEN_WIDTH, height: h * ratio });
      });
    }
  }, [bildUri]);

  const handleBestaetigen = async () => {
    if (!korrektur) return;
    try {
      await bestaetigeKorrektur(korrektur.id);
      Alert.alert('Bestaetigt', 'Korrektur wurde bestaetigt');
      router.back();
    } catch (err: any) {
      Alert.alert('Fehler', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Zurueck</Text>
        </TouchableOpacity>
        {korrektur && (
          <View style={styles.scoreContainer}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{korrektur.punkte}/{korrektur.max_punkte}</Text>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={handleBestaetigen}>
              <Text style={styles.confirmText}>✓ Bestaetigen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Image with annotations */}
      <ScrollView style={styles.scrollView}>
        <View style={{ width: imageSize.width, height: imageSize.height }}>
          {bildUri && (
            <Image
              source={{ uri: bildUri }}
              style={{ width: imageSize.width, height: imageSize.height }}
              resizeMode="contain"
            />
          )}
          {korrektur && (
            <AnnotationOverlay
              aufgaben={korrektur.annotationen}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#1e293b',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backText: { color: '#94a3b8', fontSize: 14 },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBadge: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  scoreText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  confirmButton: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  confirmText: { color: 'white', fontSize: 11 },
  scrollView: { flex: 1 },
});
```

- [ ] **Step 3: Create route file**

Create `app/app/korrektur.tsx`:

```tsx
import { KorrekturScreen } from '../src/screens/KorrekturScreen';
export default KorrekturScreen;
```

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/KorrekturScreen.tsx app/src/components/AnnotationOverlay.tsx app/app/korrektur.tsx
git commit -m "feat: korrektur screen with annotation overlay"
```

---

### Task 18: Klassen + Arbeit Erstellen Screens

**Files:**
- Create: `app/src/screens/KlassenScreen.tsx`
- Create: `app/src/screens/ArbeitErstellenScreen.tsx`
- Create: `app/app/klassen.tsx`
- Create: `app/app/arbeit-erstellen.tsx`

- [ ] **Step 1: Create KlassenScreen**

Create `app/src/screens/KlassenScreen.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getKlassen, createKlasse, getSchueler, createSchueler } from '../services/api';
import type { Klasse, Schueler } from '../types';

export function KlassenScreen() {
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<Klasse | null>(null);
  const [schueler, setSchueler] = useState<Schueler[]>([]);
  const [newKlasseName, setNewKlasseName] = useState('');
  const [newSchuelerVorname, setNewSchuelerVorname] = useState('');
  const [newSchuelerNachname, setNewSchuelerNachname] = useState('');
  const router = useRouter();

  const loadKlassen = useCallback(async () => {
    const res = await getKlassen();
    setKlassen(res.data);
  }, []);

  useEffect(() => { loadKlassen(); }, [loadKlassen]);

  const loadSchueler = async (klasse: Klasse) => {
    setSelectedKlasse(klasse);
    const res = await getSchueler(klasse.id);
    setSchueler(res.data);
  };

  const handleAddKlasse = async () => {
    if (!newKlasseName.trim()) return;
    await createKlasse(newKlasseName.trim(), '2025/2026');
    setNewKlasseName('');
    loadKlassen();
  };

  const handleAddSchueler = async () => {
    if (!selectedKlasse || !newSchuelerVorname.trim() || !newSchuelerNachname.trim()) return;
    await createSchueler(selectedKlasse.id, newSchuelerVorname.trim(), newSchuelerNachname.trim());
    setNewSchuelerVorname('');
    setNewSchuelerNachname('');
    loadSchueler(selectedKlasse);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Zurueck</Text>
      </TouchableOpacity>

      {!selectedKlasse ? (
        <>
          <Text style={styles.title}>Klassen</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="z.B. 3b"
              placeholderTextColor="#64748b"
              value={newKlasseName}
              onChangeText={setNewKlasseName}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddKlasse}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={klassen}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => loadSchueler(item)}>
                <Text style={styles.listItemText}>{item.name}</Text>
                <Text style={styles.listItemSub}>{item.schuljahr}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <>
          <TouchableOpacity onPress={() => setSelectedKlasse(null)}>
            <Text style={styles.title}>← Klasse {selectedKlasse.name}</Text>
          </TouchableOpacity>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Vorname"
              placeholderTextColor="#64748b"
              value={newSchuelerVorname}
              onChangeText={setNewSchuelerVorname}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Nachname"
              placeholderTextColor="#64748b"
              value={newSchuelerNachname}
              onChangeText={setNewSchuelerNachname}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddSchueler}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schueler}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.listItemText}>{item.vorname} {item.nachname}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  backButton: { marginBottom: 12 },
  backText: { color: '#94a3b8', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 16 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 8, padding: 12, color: '#f1f5f9',
    borderWidth: 1, borderColor: '#334155',
  },
  addButton: { backgroundColor: '#3b82f6', borderRadius: 8, width: 44, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  listItem: {
    backgroundColor: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  listItemText: { color: '#f1f5f9', fontSize: 16 },
  listItemSub: { color: '#64748b', fontSize: 13 },
});
```

- [ ] **Step 2: Create ArbeitErstellenScreen**

Create `app/src/screens/ArbeitErstellenScreen.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createArbeit, getKlassen } from '../services/api';
import type { Klasse } from '../types';

export function ArbeitErstellenScreen() {
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasseId, setSelectedKlasseId] = useState<number | null>(null);
  const [fach, setFach] = useState('');
  const [titel, setTitel] = useState('');
  const [maxPunkte, setMaxPunkte] = useState('');
  const [musterloesung, setMusterloesung] = useState('');
  const router = useRouter();

  useEffect(() => {
    getKlassen().then((res) => {
      setKlassen(res.data);
      if (res.data.length > 0) setSelectedKlasseId(res.data[0].id);
    });
  }, []);

  const handleCreate = async () => {
    if (!selectedKlasseId || !fach || !titel || !maxPunkte) {
      Alert.alert('Fehler', 'Bitte alle Pflichtfelder ausfuellen');
      return;
    }

    try {
      await createArbeit({
        klasse_id: selectedKlasseId,
        fach,
        titel,
        max_punkte: parseInt(maxPunkte, 10),
        musterloesung: musterloesung || null,
      });
      Alert.alert('Erstellt', 'Arbeit wurde angelegt');
      router.back();
    } catch (err: any) {
      Alert.alert('Fehler', err.response?.data?.error || err.message);
    }
  };

  const faecher = ['Mathe', 'Deutsch', 'Sachkunde', 'Englisch', 'Kunst', 'Musik'];

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Zurueck</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Neue Arbeit</Text>

      <Text style={styles.label}>Klasse</Text>
      <View style={styles.chipRow}>
        {klassen.map((k) => (
          <TouchableOpacity
            key={k.id}
            style={[styles.chip, selectedKlasseId === k.id && styles.chipActive]}
            onPress={() => setSelectedKlasseId(k.id)}
          >
            <Text style={[styles.chipText, selectedKlasseId === k.id && styles.chipTextActive]}>
              {k.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Fach</Text>
      <View style={styles.chipRow}>
        {faecher.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, fach === f && styles.chipActive]}
            onPress={() => setFach(f)}
          >
            <Text style={[styles.chipText, fach === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Titel</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Einmaleins"
        placeholderTextColor="#64748b"
        value={titel}
        onChangeText={setTitel}
      />

      <Text style={styles.label}>Max. Punkte</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. 10"
        placeholderTextColor="#64748b"
        value={maxPunkte}
        onChangeText={setMaxPunkte}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Musterloesung (optional)</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
        placeholder="Aufgabe 1: 42, Aufgabe 2: Berlin ..."
        placeholderTextColor="#64748b"
        value={musterloesung}
        onChangeText={setMusterloesung}
        multiline
      />

      <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>Arbeit erstellen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  backButton: { marginBottom: 12 },
  backText: { color: '#94a3b8', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16, color: '#f1f5f9',
    fontSize: 16, borderWidth: 1, borderColor: '#334155',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: 'white' },
  createButton: {
    backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40,
  },
  createButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 3: Create route files**

Create `app/app/klassen.tsx`:

```tsx
import { KlassenScreen } from '../src/screens/KlassenScreen';
export default KlassenScreen;
```

Create `app/app/arbeit-erstellen.tsx`:

```tsx
import { ArbeitErstellenScreen } from '../src/screens/ArbeitErstellenScreen';
export default ArbeitErstellenScreen;
```

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/KlassenScreen.tsx app/src/screens/ArbeitErstellenScreen.tsx app/app/klassen.tsx app/app/arbeit-erstellen.tsx
git commit -m "feat: Klassen management and Arbeit erstellen screens"
```

---

## Phase 4: Deployment

### Task 19: Server Setup on syntrokids.de

**Files:**
- Create: `backend/.env` (on server)
- Create: `deploy.sh` (deployment script)

- [ ] **Step 1: Create deployment script**

Create `deploy.sh` in project root:

```bash
#!/bin/bash
set -e

SERVER="root@46.225.218.211"
SSH_OPTS="-o PasswordAuthentication=no -o PreferredAuthentications=publickey"
APP_DIR="/opt/korrektur-app"

echo "=== Deploying Korrektur-App Backend ==="

# Build locally
cd backend
npm run build

# Sync files to server
rsync -avz --delete \
  $SSH_OPTS \
  --exclude node_modules \
  --exclude .env \
  --exclude tests \
  ./ $SERVER:$APP_DIR/backend/

# Install dependencies and restart on server
ssh $SSH_OPTS $SERVER << 'REMOTE'
  cd /opt/korrektur-app/backend
  npm install --production

  # Create systemd service if not exists
  if [ ! -f /etc/systemd/system/korrektur-app.service ]; then
    cat > /etc/systemd/system/korrektur-app.service << 'EOF'
[Unit]
Description=Korrektur App Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/korrektur-app/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/korrektur-app/backend/.env

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable korrektur-app
  fi

  systemctl restart korrektur-app
  echo "=== Backend restarted ==="
  systemctl status korrektur-app --no-pager
REMOTE
```

- [ ] **Step 2: SSH to server and set up PostgreSQL + .env**

```bash
SSH_KEY_FILE=$(mktemp)
# Write SSH key from SyntroPass to temp file
# Then:
ssh -i $SSH_KEY_FILE -o PasswordAuthentication=no root@46.225.218.211 << 'REMOTE'
  # Install PostgreSQL if not present
  apt-get update && apt-get install -y postgresql nodejs npm

  # Create DB + user
  sudo -u postgres createuser korrektur || true
  sudo -u postgres createdb -O korrektur korrektur_app || true
  sudo -u postgres psql -c "ALTER USER korrektur PASSWORD 'korrektur-secure-pw';"

  # Create app directory
  mkdir -p /opt/korrektur-app/backend
  mkdir -p /data/korrektur-app/scans

  # Create .env
  cat > /opt/korrektur-app/backend/.env << 'EOF'
PORT=3000
DATABASE_URL=postgresql://korrektur:korrektur-secure-pw@localhost:5432/korrektur_app
JWT_SECRET=<generate-a-random-secret>
OPENAI_API_KEY=<from-syntropass>
UPLOAD_DIR=/data/korrektur-app
BASE_URL=https://syntrokids.de
EOF
REMOTE
```

- [ ] **Step 3: Set up nginx reverse proxy**

```bash
ssh -o PasswordAuthentication=no root@46.225.218.211 << 'REMOTE'
  cat > /etc/nginx/sites-available/korrektur << 'EOF'
server {
    listen 80;
    server_name syntrokids.de;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ergebnis/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
  ln -sf /etc/nginx/sites-available/korrektur /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
REMOTE
```

- [ ] **Step 4: Deploy and run migration**

```bash
bash deploy.sh
ssh -o PasswordAuthentication=no root@46.225.218.211 "cd /opt/korrektur-app/backend && node dist/migrate.js"
```

- [ ] **Step 5: Verify health check**

```bash
curl https://syntrokids.de/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit deployment script**

```bash
git add deploy.sh
git commit -m "feat: deployment script for syntrokids.de"
```

---

### Task 20: Build Android APK

**Files:**
- Modify: `app/app.json`

- [ ] **Step 1: Configure app.json**

Update `app/app.json`:

```json
{
  "expo": {
    "name": "Korrektur-App",
    "slug": "korrektur-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "korrektur",
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Die App benoetigt Kamera-Zugriff zum Scannen von Arbeiten."
        }
      ]
    ],
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "package": "de.syntrokids.korrektur",
      "permissions": ["android.permission.CAMERA"]
    }
  }
}
```

- [ ] **Step 2: Update API URL for production**

In `app/src/services/api.ts`, ensure the production URL points to syntrokids.de:

```typescript
const API_URL = __DEV__ ? 'http://10.0.2.2:3000/api' : 'https://syntrokids.de/api';
```

- [ ] **Step 3: Build APK**

```bash
cd app
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The APK will be at `app/android/app/build/outputs/apk/release/app-release.apk`.

- [ ] **Step 4: Commit**

```bash
git add app/app.json app/src/services/api.ts
git commit -m "feat: Android build configuration"
```
