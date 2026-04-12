import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateQrSheet } from '../services/qr';
import { generateStudentPdfs } from '../services/pdf';
import { config } from '../config';

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(config.uploadDir, 'templates');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Nur PDF-Dateien erlaubt'));
  },
});

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

// GET /:id/pdf - serve the uploaded template PDF
router.get('/:id/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.pdf_pfad FROM arbeiten a JOIN klassen k ON a.klasse_id = k.id WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0 || !result.rows[0].pdf_pfad) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    return res.sendFile(path.resolve(result.rows[0].pdf_pfad));
  } catch (err) {
    console.error('GET /arbeiten/:id/pdf error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/pdf-preview - convert first page to PNG (no auth for WebView)
router.get('/:id/pdf-preview', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.pdf_pfad FROM arbeiten a JOIN klassen k ON a.klasse_id = k.id WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0 || !result.rows[0].pdf_pfad) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const pdfPath = path.resolve(result.rows[0].pdf_pfad);
    const previewDir = path.join(config.uploadDir, 'previews');
    fs.mkdirSync(previewDir, { recursive: true });
    const previewBase = path.join(previewDir, `arbeit-${req.params.id}`);
    const previewPath = `${previewBase}-1.png`;

    // Generate preview if not cached
    if (!fs.existsSync(previewPath)) {
      const { execSync } = require('child_process');
      execSync(`pdftoppm -png -f 1 -l 1 -r 200 "${pdfPath}" "${previewBase}"`, { timeout: 10000 });
    }

    if (fs.existsSync(previewPath)) {
      return res.sendFile(previewPath);
    }
    return res.status(500).json({ error: 'Preview generation failed' });
  } catch (err) {
    console.error('GET /arbeiten/:id/pdf-preview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete arbeit
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `DELETE FROM arbeiten WHERE id = $1 AND klasse_id IN (SELECT id FROM klassen WHERE user_id = $2) RETURNING id`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Arbeit not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /arbeiten/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/upload-pdf - upload template PDF for an arbeit
router.post('/:id/upload-pdf', pdfUpload.single('pdf'), async (req: AuthRequest, res: Response) => {
  try {
    const ownerCheck = await query(
      `SELECT a.id FROM arbeiten a JOIN klassen k ON a.klasse_id = k.id WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Arbeit not found' });
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });

    const result = await query(
      'UPDATE arbeiten SET pdf_pfad = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.file.path, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /arbeiten/:id/upload-pdf error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/generate-pdfs - generate personalized PDFs with QR codes
router.post('/:id/generate-pdfs', async (req: AuthRequest, res: Response) => {
  const { schueler_ids, qr_x, qr_y } = req.body as {
    schueler_ids?: number[];
    qr_x?: number;
    qr_y?: number;
  };

  try {
    const arbeitResult = await query(
      `SELECT a.* FROM arbeiten a JOIN klassen k ON a.klasse_id = k.id WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (arbeitResult.rows.length === 0) return res.status(404).json({ error: 'Arbeit not found' });

    const arbeit = arbeitResult.rows[0];
    if (!arbeit.pdf_pfad) return res.status(400).json({ error: 'Kein PDF hochgeladen' });

    // Save QR position
    if (qr_x !== undefined && qr_y !== undefined) {
      await query(
        'UPDATE arbeiten SET qr_position_x = $1, qr_position_y = $2 WHERE id = $3',
        [qr_x, qr_y, req.params.id]
      );
    }

    // Get students
    let studentRows;
    if (schueler_ids && schueler_ids.length > 0) {
      const placeholders = schueler_ids.map((_, i) => `$${i + 2}`).join(',');
      studentRows = await query(
        `SELECT id, vorname, nachname FROM schueler WHERE klasse_id = $1 AND id IN (${placeholders}) AND aktiv = true ORDER BY nachname, vorname`,
        [arbeit.klasse_id, ...schueler_ids]
      );
    } else {
      studentRows = await query(
        'SELECT id, vorname, nachname FROM schueler WHERE klasse_id = $1 AND aktiv = true ORDER BY nachname, vorname',
        [arbeit.klasse_id]
      );
    }

    if (studentRows.rows.length === 0) {
      return res.status(400).json({ error: 'Keine Schueler ausgewaehlt' });
    }

    const x = qr_x ?? arbeit.qr_position_x ?? 80;
    const y = qr_y ?? arbeit.qr_position_y ?? 5;

    const outputPath = await generateStudentPdfs(
      arbeit.id,
      arbeit.pdf_pfad,
      studentRows.rows,
      x,
      y
    );

    // Update arbeit status
    await query("UPDATE arbeiten SET status = 'scannen' WHERE id = $1", [req.params.id]);

    return res.json({ pdf_path: outputPath, schueler_count: studentRows.rows.length });
  } catch (err) {
    console.error('POST /arbeiten/:id/generate-pdfs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/download-pdf - download the generated combined PDF
router.get('/:id/download-pdf', async (req: AuthRequest, res: Response) => {
  try {
    const arbeitResult = await query(
      `SELECT a.id FROM arbeiten a JOIN klassen k ON a.klasse_id = k.id WHERE a.id = $1 AND k.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (arbeitResult.rows.length === 0) return res.status(404).json({ error: 'Arbeit not found' });

    const id = String(req.params.id);
    const pdfPath = path.join(config.uploadDir, 'pdfs', id, `arbeit-${id}-alle.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: 'PDF noch nicht generiert' });

    return res.download(pdfPath, `arbeit-${id}.pdf`);
  } catch (err) {
    console.error('GET /arbeiten/:id/download-pdf error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
