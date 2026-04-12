import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateQrSheet } from '../services/qr';

const router = Router();

router.use(authMiddleware);

// GET / - list arbeiten for current user, optional ?klasse_id filter
router.get('/', async (req: AuthRequest, res: Response) => {
  const { klasse_id } = req.query as { klasse_id?: string };

  try {
    if (klasse_id) {
      const result = await query(
        `SELECT a.* FROM arbeiten a
         JOIN klassen k ON a.klasse_id = k.id
         WHERE k.user_id = $1 AND a.klasse_id = $2
         ORDER BY a.datum DESC`,
        [req.userId, klasse_id]
      );
      return res.json(result.rows);
    } else {
      const result = await query(
        `SELECT a.* FROM arbeiten a
         JOIN klassen k ON a.klasse_id = k.id
         WHERE k.user_id = $1
         ORDER BY a.datum DESC`,
        [req.userId]
      );
      return res.json(result.rows);
    }
  } catch (err) {
    console.error('GET /arbeiten error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create a new arbeit
router.post('/', async (req: AuthRequest, res: Response) => {
  const { klasse_id, fach, titel, max_punkte, datum, musterloesung, notenschluessel } =
    req.body as {
      klasse_id?: number;
      fach?: string;
      titel?: string;
      max_punkte?: number;
      datum?: string;
      musterloesung?: string;
      notenschluessel?: unknown;
    };

  if (!klasse_id || !fach || !titel || max_punkte === undefined) {
    return res.status(400).json({ error: 'klasse_id, fach, titel, and max_punkte are required' });
  }

  try {
    // Verify klasse belongs to user
    const klasseCheck = await query(
      'SELECT id FROM klassen WHERE id = $1 AND user_id = $2',
      [klasse_id, req.userId]
    );
    if (klasseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Klasse not found' });
    }

    const notenschluesselValue =
      notenschluessel !== undefined && typeof notenschluessel === 'object'
        ? JSON.stringify(notenschluessel)
        : notenschluessel ?? null;

    const result = await query(
      `INSERT INTO arbeiten (klasse_id, fach, titel, max_punkte, datum, musterloesung, notenschluessel)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7)
       RETURNING *`,
      [klasse_id, fach, titel, max_punkte, datum ?? null, musterloesung ?? null, notenschluesselValue]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /arbeiten error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get single arbeit
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.* FROM arbeiten a
       JOIN klassen k ON a.klasse_id = k.id
       WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Arbeit not found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /arbeiten/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update arbeit (only provided fields)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { fach, titel, max_punkte, datum, musterloesung, notenschluessel, status } =
    req.body as {
      fach?: string;
      titel?: string;
      max_punkte?: number;
      datum?: string;
      musterloesung?: string;
      notenschluessel?: unknown;
      status?: string;
    };

  try {
    // Verify ownership via klasse
    const ownerCheck = await query(
      `SELECT a.id FROM arbeiten a
       JOIN klassen k ON a.klasse_id = k.id
       WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Arbeit not found' });
    }

    const notenschluesselValue =
      notenschluessel !== undefined && typeof notenschluessel === 'object'
        ? JSON.stringify(notenschluessel)
        : notenschluessel ?? null;

    const result = await query(
      `UPDATE arbeiten
       SET fach           = COALESCE($1, fach),
           titel          = COALESCE($2, titel),
           max_punkte     = COALESCE($3, max_punkte),
           datum          = COALESCE($4, datum),
           musterloesung  = COALESCE($5, musterloesung),
           notenschluessel = COALESCE($6, notenschluessel),
           status         = COALESCE($7, status)
       WHERE id = $8
       RETURNING *`,
      [
        fach ?? null,
        titel ?? null,
        max_punkte ?? null,
        datum ?? null,
        musterloesung ?? null,
        notenschluesselValue,
        status ?? null,
        req.params.id,
      ]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /arbeiten/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/qr-codes - generate QR code sheet for all students in the arbeit's klasse
router.get('/:id/qr-codes', async (req: AuthRequest, res: Response) => {
  try {
    // Verify arbeit belongs to user (join klassen for user_id check) and get klasse_id
    const arbeitResult = await query(
      `SELECT a.id, a.klasse_id FROM arbeiten a
       JOIN klassen k ON a.klasse_id = k.id
       WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (arbeitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Arbeit not found' });
    }

    const arbeit = arbeitResult.rows[0];

    // Get all students for the arbeit's klasse
    const studentResult = await query(
      `SELECT id, vorname, nachname FROM schueler
       WHERE klasse_id = $1
       ORDER BY nachname, vorname`,
      [arbeit.klasse_id]
    );

    // Parse ?pages query param (default 2)
    const pagesParam = req.query.pages as string | undefined;
    const pages = pagesParam ? parseInt(pagesParam, 10) : 2;

    const html = await generateQrSheet(arbeit.id, studentResult.rows, pages);
    return res.type('html').send(html);
  } catch (err) {
    console.error('GET /arbeiten/:id/qr-codes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
