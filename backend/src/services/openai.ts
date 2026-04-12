import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

export interface KorrekturAufgabe {
  nummer: number;
  erkannter_text: string;
  bewertung: 'richtig' | 'falsch' | 'teilweise';
  punkte: number;
  max_punkte: number;
  position: { x: number; y: number; w: number; h: number };
  feedback: string | null;
}

export interface KorrekturResult {
  aufgaben: KorrekturAufgabe[];
  gesamt_punkte: number;
  max_punkte: number;
}

export async function korrigiereSeite(
  bildPfad: string,
  fach: string,
  maxPunkte: number,
  musterloesung?: string
): Promise<KorrekturResult> {
  const imageBuffer = fs.readFileSync(bildPfad);
  const base64 = imageBuffer.toString('base64');

  const ext = path.extname(bildPfad).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  let systemPrompt = `Du bist eine Korrektur-KI fuer Grundschularbeiten. Fach: ${fach}.

Deine Aufgaben:
- Erkenne die Handschrift auf dem Bild
- Bewerte jede Aufgabe einzeln
- Vergib Punkte (maximal ${maxPunkte} Punkte gesamt)
- Gib die Position jeder Aufgabe als Prozent (0-100) der Bildgroesse an (x, y, w, h)
- Gib Feedback fuer falsche oder teilweise richtige Antworten

Antworte ausschliesslich als JSON-Objekt im folgenden Format:
{
  "aufgaben": [
    {
      "nummer": 1,
      "erkannter_text": "erkannter handgeschriebener Text",
      "bewertung": "richtig" | "falsch" | "teilweise",
      "punkte": 0,
      "max_punkte": 0,
      "position": { "x": 0, "y": 0, "w": 0, "h": 0 },
      "feedback": null | "Feedback-Text"
    }
  ],
  "gesamt_punkte": 0,
  "max_punkte": ${maxPunkte}
}`;

  if (musterloesung) {
    systemPrompt += `\n\nMusterloesung:\n${musterloesung}`;
  }

  const dataUri = `data:${mimeType};base64,${base64}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUri,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'Korrigiere diese Arbeit.',
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Fehler: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Leere Antwort von OpenAI API');
  }

  const result = JSON.parse(content) as KorrekturResult;
  return result;
}
