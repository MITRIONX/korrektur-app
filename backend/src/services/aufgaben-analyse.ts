import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config';

export interface AnalysierteAufgabe {
  nummer: number;
  beschreibung: string;
  typ: string;
  loesungen: any;
  max_punkte: number;
}

export interface AufgabenAnalyse {
  aufgaben: AnalysierteAufgabe[];
  zusammenfassung: string;
  empfohlene_max_punkte: number;
}

/**
 * Converts PDF pages to PNG images using pdftoppm.
 * Returns array of base64-encoded PNG strings.
 */
function pdfToImages(pdfPath: string): string[] {
  const tmpDir = path.join(config.uploadDir, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const prefix = path.join(tmpDir, `analyze-${Date.now()}`);

  execSync(`pdftoppm -png -r 200 "${pdfPath}" "${prefix}"`, { timeout: 30000 });

  // Find generated files
  const images: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const file = `${prefix}-${i}.png`;
    if (fs.existsSync(file)) {
      images.push(fs.readFileSync(file).toString('base64'));
      fs.unlinkSync(file); // cleanup
    } else {
      break;
    }
  }
  return images;
}

/**
 * Sends PDF pages to GPT-4o Vision for task analysis.
 * Returns structured tasks with descriptions and solutions.
 */
export async function analysiereArbeitsblatt(pdfPath: string, fach: string): Promise<AufgabenAnalyse> {
  const images = pdfToImages(pdfPath);

  if (images.length === 0) {
    throw new Error('PDF konnte nicht konvertiert werden');
  }

  const imageContent = images.map(b64 => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${b64}`, detail: 'high' as const },
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `Du bist eine Korrektur-KI fuer Grundschul-Arbeiten (Fach: ${fach}).

Analysiere dieses Arbeitsblatt. Liste JEDE Aufgabe auf:
- nummer: Aufgabennummer
- beschreibung: Was muss der Schueler tun? (kurz und klar)
- typ: Art der Aufgabe (z.B. "zuordnung", "lueckentext", "konjugation", "definition", "rechnung", "ankreuzen", "schreiben", "zeichnen")
- loesungen: Die korrekten Loesungen (als Array von Strings, oder als Objekt bei komplexen Aufgaben)
- max_punkte: Empfohlene Punkte fuer diese Aufgabe

Antworte als JSON:
{
  "aufgaben": [...],
  "zusammenfassung": "Kurze Beschreibung was geprueft wird",
  "empfohlene_max_punkte": Gesamtpunkte
}`,
          },
        ],
      }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Fehler: ${response.status} ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content) as AufgabenAnalyse;
}
