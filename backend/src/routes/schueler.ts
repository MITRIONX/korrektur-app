import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

async function verifyKlasseOwnership(klasseId: string | string[], userId: number): Promise<boolean> {
  const result = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [String(klasseId), userId]
  );
  return result.rows.length > 0;
}

// GET / - list schueler (default: only active)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { klasseId } = req.params;
  const showAll = req.query.alle === 'true';

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) return res.status(404).json({ error: 'Klasse not found' });

    const where = showAll
      ? 'WHERE klasse_id = $1'
      : 'WHERE klasse_id = $1 AND aktiv = true';
    const result = await query(
      `SELECT * FROM schueler ${where} ORDER BY nachname, vorname`,
      [klasseId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /schueler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create schueler
router.post('/', async (req: AuthRequest, res: Response) => {
  const { klasseId } = req.params;
  const { vorname, nachname } = req.body;

  if (!vorname || !nachname) {
    return res.status(400).json({ error: 'vorname and nachname are required' });
  }

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) return res.status(404).json({ error: 'Klasse not found' });

    const result = await query(
      'INSERT INTO schueler (klasse_id, vorname, nachname) VALUES ($1, $2, $3) RETURNING *',
      [klasseId, vorname, nachname]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /schueler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:schuelerId - edit schueler
router.put('/:schuelerId', async (req: AuthRequest, res: Response) => {
  const { klasseId, schuelerId } = req.params;
  const { vorname, nachname } = req.body;

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) return res.status(404).json({ error: 'Klasse not found' });

    const result = await query(
      `UPDATE schueler SET
        vorname = COALESCE($1, vorname),
        nachname = COALESCE($2, nachname),
        updated_at = NOW()
      WHERE id = $3 AND klasse_id = $4 RETURNING *`,
      [vorname ?? null, nachname ?? null, schuelerId, klasseId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schueler not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /schueler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:schuelerId/austreten - soft-delete (mark inactive)
router.put('/:schuelerId/austreten', async (req: AuthRequest, res: Response) => {
  const { klasseId, schuelerId } = req.params;

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) return res.status(404).json({ error: 'Klasse not found' });

    const result = await query(
      `UPDATE schueler SET aktiv = false, updated_at = NOW()
       WHERE id = $1 AND klasse_id = $2 RETURNING *`,
      [schuelerId, klasseId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schueler not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /schueler/austreten error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:schuelerId - hard delete
router.delete('/:schuelerId', async (req: AuthRequest, res: Response) => {
  const { klasseId, schuelerId } = req.params;

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) return res.status(404).json({ error: 'Klasse not found' });

    const result = await query(
      'DELETE FROM schueler WHERE id = $1 AND klasse_id = $2 RETURNING id',
      [schuelerId, klasseId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schueler not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /schueler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
