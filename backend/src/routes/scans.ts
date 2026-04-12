import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { buildQrContent } from '../services/qr';

const router = Router();

router.use(authMiddleware);

// Configure upload directory
const scansDir = path.join(config.uploadDir, 'scans');
fs.mkdirSync(scansDir, { recursive: true });

// Configure multer with disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, scansDir);
  },
  filename: (_req, _file, cb) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    cb(null, `${timestamp}-${random}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /:arbeitId/scans - upload a scan
router.post('/:arbeitId/scans', upload.single('bild'), async (req: AuthRequest, res: Response) => {
  const arbeitId = req.params.arbeitId;
  const { schueler_id, seiten_nr } = req.body as { schueler_id?: string; seiten_nr?: string };

  if (!schueler_id || !seiten_nr) {
    return res.status(400).json({ error: 'schueler_id and seiten_nr are required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'bild file is required' });
  }

  try {
    // Verify arbeit belongs to user (join klassen)
    const arbeitResult = await query(
      `SELECT a.id FROM arbeiten a
       JOIN klassen k ON a.klasse_id = k.id
       WHERE a.id = $1 AND k.user_id = $2`,
      [arbeitId, req.userId]
    );
    if (arbeitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Arbeit not found' });
    }

    const arbeitIdNum = parseInt(arbeitId as string, 10);
    const schuelerIdNum = parseInt(schueler_id as string, 10);
    const seitenNrNum = parseInt(seiten_nr as string, 10);

    const qrCode = buildQrContent(arbeitIdNum, schuelerIdNum, seitenNrNum);
    const bildPfad = req.file.path;

    const result = await query(
      `INSERT INTO scan_seiten (arbeit_id, schueler_id, seiten_nr, bild_pfad, qr_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (arbeit_id, schueler_id, seiten_nr) DO UPDATE
         SET bild_pfad = EXCLUDED.bild_pfad,
             qr_code   = EXCLUDED.qr_code
       RETURNING *`,
      [arbeitIdNum, schuelerIdNum, seitenNrNum, bildPfad, qrCode]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /:arbeitId/scans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:arbeitId/scans - list all scans for an arbeit
router.get('/:arbeitId/scans', async (req: AuthRequest, res: Response) => {
  const { arbeitId } = req.params;

  try {
    // Verify arbeit belongs to user
    const arbeitResult = await query(
      `SELECT a.id FROM arbeiten a
       JOIN klassen k ON a.klasse_id = k.id
       WHERE a.id = $1 AND k.user_id = $2`,
      [arbeitId, req.userId]
    );
    if (arbeitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Arbeit not found' });
    }

    const result = await query(
      `SELECT ss.*, s.vorname, s.nachname
       FROM scan_seiten ss
       JOIN schueler s ON ss.schueler_id = s.id
       WHERE ss.arbeit_id = $1
       ORDER BY s.nachname, s.vorname, ss.seiten_nr`,
      [arbeitId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('GET /:arbeitId/scans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
