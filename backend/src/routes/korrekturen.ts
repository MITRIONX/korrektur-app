import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { korrigiereScan } from '../services/korrektur';

const router = Router();

router.use(authMiddleware);

// POST /scans/:scanId/korrigieren - triggers AI correction
router.post('/scans/:scanId/korrigieren', async (req: AuthRequest, res: Response) => {
  const { scanId } = req.params;

  try {
    // Verify ownership: scan_seiten -> arbeiten -> klassen -> user_id
    const ownerCheck = await query(
      `SELECT ss.id FROM scan_seiten ss
       JOIN arbeiten a ON ss.arbeit_id = a.id
       JOIN klassen k ON a.klasse_id = k.id
       WHERE ss.id = $1 AND k.user_id = $2`,
      [scanId, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const result = await korrigiereScan(parseInt(scanId as string, 10));
    return res.json(result);
  } catch (err) {
    console.error('POST /scans/:scanId/korrigieren error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /scans/:scanId/korrektur - get correction for a scan
router.get('/scans/:scanId/korrektur', async (req: AuthRequest, res: Response) => {
  const { scanId } = req.params;

  try {
    const result = await query(
      `SELECT k.* FROM korrekturen k
       JOIN scan_seiten ss ON k.scan_seite_id = ss.id
       JOIN arbeiten a ON ss.arbeit_id = a.id
       JOIN klassen kl ON a.klasse_id = kl.id
       WHERE ss.id = $1 AND kl.user_id = $2`,
      [scanId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Korrektur not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /scans/:scanId/korrektur error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /korrekturen/:id - manually edit correction
router.put('/korrekturen/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { punkte, annotationen, feedback } = req.body as {
    punkte?: number;
    annotationen?: unknown;
    feedback?: string;
  };

  try {
    // Verify ownership through chain: korrekturen -> scan_seiten -> arbeiten -> klassen
    const ownerCheck = await query(
      `SELECT k.id FROM korrekturen k
       JOIN scan_seiten ss ON k.scan_seite_id = ss.id
       JOIN arbeiten a ON ss.arbeit_id = a.id
       JOIN klassen kl ON a.klasse_id = kl.id
       WHERE k.id = $1 AND kl.user_id = $2`,
      [id, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Korrektur not found' });
    }

    const annotationenValue =
      annotationen !== undefined
        ? typeof annotationen === 'object'
          ? JSON.stringify(annotationen)
          : annotationen
        : undefined;

    const result = await query(
      `UPDATE korrekturen SET
         punkte       = COALESCE($1, punkte),
         annotationen = COALESCE($2, annotationen),
         feedback     = COALESCE($3, feedback),
         status       = 'manuell_angepasst',
         updated_at   = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        punkte !== undefined ? punkte : null,
        annotationenValue !== undefined ? annotationenValue : null,
        feedback !== undefined ? feedback : null,
        id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /korrekturen/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /korrekturen/:id/bestaetigen - confirm correction
router.put('/korrekturen/:id/bestaetigen', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const ownerCheck = await query(
      `SELECT k.id FROM korrekturen k
       JOIN scan_seiten ss ON k.scan_seite_id = ss.id
       JOIN arbeiten a ON ss.arbeit_id = a.id
       JOIN klassen kl ON a.klasse_id = kl.id
       WHERE k.id = $1 AND kl.user_id = $2`,
      [id, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Korrektur not found' });
    }

    const result = await query(
      `UPDATE korrekturen SET
         status     = 'bestaetigt',
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /korrekturen/:id/bestaetigen error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
