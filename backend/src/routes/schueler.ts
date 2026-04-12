import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Helper: verify klasse belongs to user
async function verifyKlasseOwnership(klasseId: string | string[], userId: number): Promise<boolean> {
  const result = await query(
    'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
    [String(klasseId), userId]
  );
  return result.rows.length > 0;
}

// GET / - list all schueler for klasse
router.get('/', async (req: AuthRequest, res: Response) => {
  const { klasseId } = req.params;

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) {
      return res.status(404).json({ error: 'Klasse not found' });
    }

    const result = await query(
      'SELECT * FROM schueler WHERE klasse_id = $1 ORDER BY nachname, vorname',
      [klasseId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /schueler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create schueler in klasse
router.post('/', async (req: AuthRequest, res: Response) => {
  const { klasseId } = req.params;
  const { vorname, nachname } = req.body as { vorname?: string; nachname?: string };

  if (!vorname || !nachname) {
    return res.status(400).json({ error: 'vorname and nachname are required' });
  }

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) {
      return res.status(404).json({ error: 'Klasse not found' });
    }

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

// DELETE /:schuelerId - delete schueler
router.delete('/:schuelerId', async (req: AuthRequest, res: Response) => {
  const { klasseId, schuelerId } = req.params;

  try {
    const owned = await verifyKlasseOwnership(klasseId, req.userId!);
    if (!owned) {
      return res.status(404).json({ error: 'Klasse not found' });
    }

    const result = await query(
      'DELETE FROM schueler WHERE id = $1 AND klasse_id = $2 RETURNING id',
      [schuelerId, klasseId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schueler not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /schueler/:schuelerId error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
