import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// GET / - list all klassen for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM klassen WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /klassen error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create a new klasse
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, schuljahr, maskottchen } = req.body as { name?: string; schuljahr?: string; maskottchen?: string };

  if (!name || !schuljahr) {
    return res.status(400).json({ error: 'name and schuljahr are required' });
  }

  try {
    const result = await query(
      'INSERT INTO klassen (name, schuljahr, maskottchen, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, schuljahr, maskottchen || null, req.userId]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /klassen error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get single klasse
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM klassen WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Klasse not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /klassen/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update klasse (only provided fields)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name, schuljahr, maskottchen } = req.body as { name?: string; schuljahr?: string; maskottchen?: string };

  try {
    const result = await query(
      `UPDATE klassen
       SET name = COALESCE($1, name),
           schuljahr = COALESCE($2, schuljahr),
           maskottchen = COALESCE($3, maskottchen),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name ?? null, schuljahr ?? null, maskottchen ?? null, req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Klasse not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /klassen/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete klasse
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM klassen WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Klasse not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /klassen/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
