import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';

const router = Router();

function signToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, passwordHash, name]
    );

    const user = result.rows[0];
    const token = signToken(user.id);

    return res.status(201).json({ token, user });
  } catch (err: unknown) {
    const pgError = err as { code?: string };
    if (pgError.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await query(
      'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    const { password_hash: _omit, ...userWithoutPassword } = user;

    return res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
