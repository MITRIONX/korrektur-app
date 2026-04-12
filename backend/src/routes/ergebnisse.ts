import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper: verify arbeit ownership
async function verifyArbeitOwnership(
  arbeitId: string | string[],
  userId: number
): Promise<boolean> {
  const result = await query(
    `SELECT a.id FROM arbeiten a
     JOIN klassen k ON a.klasse_id = k.id
     WHERE a.id = $1 AND k.user_id = $2`,
    [arbeitId, userId]
  );
  return result.rows.length > 0;
}

// POST /arbeiten/:arbeitId/ergebnisse/generieren (authenticated)
router.post(
  '/arbeiten/:arbeitId/ergebnisse/generieren',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { arbeitId } = req.params;

    try {
      const owned = await verifyArbeitOwnership(arbeitId, req.userId!);
      if (!owned) {
        return res.status(404).json({ error: 'Arbeit not found' });
      }

      // Aggregate corrections per student
      const aggregated = await query(
        `SELECT
           ss.schueler_id,
           SUM(k.punkte)     AS gesamt_punkte,
           SUM(k.max_punkte) AS max_punkte
         FROM scan_seiten ss
         JOIN korrekturen k ON k.scan_seite_id = ss.id
         WHERE ss.arbeit_id = $1
           AND k.status IN ('ki_korrigiert', 'manuell_angepasst', 'bestaetigt')
         GROUP BY ss.schueler_id`,
        [arbeitId]
      );

      const results = [];

      for (const row of aggregated.rows) {
        const shareToken = crypto.randomBytes(16).toString('hex');

        const upsertResult = await query(
          `INSERT INTO ergebnisse (arbeit_id, schueler_id, gesamt_punkte, max_punkte, share_token)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (arbeit_id, schueler_id)
           DO UPDATE SET
             gesamt_punkte = EXCLUDED.gesamt_punkte,
             max_punkte    = EXCLUDED.max_punkte
           RETURNING *`,
          [arbeitId, row.schueler_id, row.gesamt_punkte, row.max_punkte, shareToken]
        );

        results.push(upsertResult.rows[0]);
      }

      return res.json(results);
    } catch (err) {
      console.error('POST /arbeiten/:arbeitId/ergebnisse/generieren error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /arbeiten/:arbeitId/ergebnisse (authenticated)
router.get(
  '/arbeiten/:arbeitId/ergebnisse',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { arbeitId } = req.params;

    try {
      const owned = await verifyArbeitOwnership(arbeitId, req.userId!);
      if (!owned) {
        return res.status(404).json({ error: 'Arbeit not found' });
      }

      const result = await query(
        `SELECT
           e.*,
           s.vorname,
           s.nachname
         FROM ergebnisse e
         JOIN schueler s ON e.schueler_id = s.id
         WHERE e.arbeit_id = $1
         ORDER BY e.gesamt_punkte DESC`,
        [arbeitId]
      );

      const rows = result.rows;

      let stats = {
        durchschnitt: null as number | null,
        max: null as number | null,
        min: null as number | null,
        anzahl: 0,
      };

      if (rows.length > 0) {
        const punkte = rows.map((r) => Number(r.gesamt_punkte));
        const sum = punkte.reduce((a, b) => a + b, 0);
        stats = {
          durchschnitt: Math.round((sum / punkte.length) * 100) / 100,
          max: Math.max(...punkte),
          min: Math.min(...punkte),
          anzahl: rows.length,
        };
      }

      return res.json({ ergebnisse: rows, stats });
    } catch (err) {
      console.error('GET /arbeiten/:arbeitId/ergebnisse error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /ergebnis/:shareToken (public)
router.get('/ergebnis/:shareToken', async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  try {
    const result = await query(
      `SELECT
         e.*,
         s.vorname,
         s.nachname,
         a.fach,
         a.titel,
         a.datum
       FROM ergebnisse e
       JOIN schueler s ON e.schueler_id = s.id
       JOIN arbeiten a ON e.arbeit_id = a.id
       WHERE e.share_token = $1`,
      [shareToken]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /ergebnis/:shareToken error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /ergebnis/:shareToken/view (public)
router.get('/ergebnis/:shareToken/view', async (req: Request, res: Response) => {
  const { shareToken } = req.params;

  try {
    const result = await query(
      `SELECT
         e.*,
         s.vorname,
         s.nachname,
         a.fach,
         a.titel,
         a.datum
       FROM ergebnisse e
       JOIN schueler s ON e.schueler_id = s.id
       JOIN arbeiten a ON e.arbeit_id = a.id
       WHERE e.share_token = $1`,
      [shareToken]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.render('ergebnis', { data: result.rows[0] });
  } catch (err) {
    console.error('GET /ergebnis/:shareToken/view error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
