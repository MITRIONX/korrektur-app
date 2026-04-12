import { query } from '../db';
import { korrigiereSeite, KorrekturResult } from './openai';

export async function korrigiereScan(scanSeiteId: number): Promise<KorrekturResult> {
  const result = await query(
    `SELECT
       ss.bild_pfad,
       a.fach,
       a.max_punkte,
       a.musterloesung
     FROM scan_seiten ss
     JOIN arbeiten a ON a.id = ss.arbeit_id
     WHERE ss.id = $1`,
    [scanSeiteId]
  );

  if (result.rows.length === 0) {
    throw new Error(`scan_seite mit id ${scanSeiteId} nicht gefunden`);
  }

  const { bild_pfad, fach, max_punkte, musterloesung } = result.rows[0] as {
    bild_pfad: string;
    fach: string;
    max_punkte: number;
    musterloesung: string | null;
  };

  const korrekturResult = await korrigiereSeite(
    bild_pfad,
    fach,
    Number(max_punkte),
    musterloesung ?? undefined
  );

  await query(
    `INSERT INTO korrekturen
       (scan_seite_id, punkte, max_punkte, annotationen, feedback, status, ki_rohdaten)
     VALUES ($1, $2, $3, $4, $5, 'ki_korrigiert', $6)
     ON CONFLICT (scan_seite_id) DO UPDATE SET
       punkte       = EXCLUDED.punkte,
       max_punkte   = EXCLUDED.max_punkte,
       annotationen = EXCLUDED.annotationen,
       feedback     = EXCLUDED.feedback,
       status       = 'ki_korrigiert',
       ki_rohdaten  = EXCLUDED.ki_rohdaten,
       updated_at   = NOW()`,
    [
      scanSeiteId,
      korrekturResult.gesamt_punkte,
      korrekturResult.max_punkte,
      JSON.stringify(korrekturResult.aufgaben),
      korrekturResult.aufgaben
        .filter((a) => a.feedback !== null)
        .map((a) => `Aufgabe ${a.nummer}: ${a.feedback}`)
        .join('\n') || null,
      JSON.stringify(korrekturResult),
    ]
  );

  return korrekturResult;
}
