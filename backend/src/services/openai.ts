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
  musterloesung?: string | null
): Promise<KorrekturResult> {
  const imageBuffer = fs.readFileSync(bildPfad);
  const base64 = imageBuffer.toString('base64');

  const ext = path.extname(bildPfad).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  // Parse musterloesung - could be JSON (from KI-Analyse) or plain text
  let aufgabenInfo = '';
  if (musterloesung) {
    try {
      const analyse = JSON.parse(musterloesung);
      if (analyse.aufgaben && Array.isArray(analyse.aufgaben)) {
        aufgabenInfo = '\n\n=== AUFGABEN UND KORREKTE LOESUNGEN ===\n';
        for (const a of analyse.aufgaben) {
          aufgabenInfo += `\nAufgabe ${a.nummer}: ${a.beschreibung}\n`;
          aufgabenInfo += `Typ: ${a.typ}\n`;
          aufgabenInfo += `Max. Punkte: ${a.max_punkte}\n`;
          aufgabenInfo += `Korrekte Loesung: ${typeof a.loesungen === 'string' ? a.loesungen : JSON.stringify(a.loesungen)}\n`;
        }
        aufgabenInfo += '\n=== ENDE LOESUNGEN ===\n';
      }
    } catch {
      // Plain text musterloesung
      aufgabenInfo = `\n\nMusterloesung:\n${musterloesung}`;
    }
  }

  const systemPrompt = `Du bist eine strenge aber faire Korrektur-KI fuer Grundschularbeiten. Fach: ${fach}.

WICHTIGE REGELN:
- Vergleiche die handgeschriebenen Antworten des Schuelers EXAKT mit den korrekten Loesungen
- LEERE oder NICHT AUSGEFUELLTE Felder = 0 Punkte, bewertung "falsch"
- Wenn ein Feld leer ist, schreibe als erkannter_text "LEER" oder "nicht ausgefuellt"
- Sei STRENG: Nur korrekte Antworten bekommen volle Punkte
- Bei Rechtschreibfehlern in der Grundschule: leichte Fehler tolerieren, grobe Fehler = teilweise
- Gib bei jeder falschen Antwort die richtige Loesung als Feedback

Fuer jede Aufgabe:
1. Erkenne was der Schueler geschrieben hat (oder ob das Feld LEER ist)
2. Vergleiche mit der korrekten Loesung
3. Bewerte: "richtig" (volle Punkte), "teilweise" (halbe Punkte), "falsch" (0 Punkte)
4. Position der Aufgabe im Bild als Prozent (x, y, w, h jeweils 0-100)
${aufgabenInfo}

Antworte als JSON:
{
  "aufgaben": [
    {
      "nummer": 1,
      "erkannter_text": "was der Schueler geschrieben hat oder LEER",
      "bewertung": "richtig|falsch|teilweise",
      "punkte": 0,
      "max_punkte": 2,
      "position": { "x": 10, "y": 20, "w": 80, "h": 10 },
      "feedback": null oder "Richtig waere: ..."
    }
  ],
  "gesamt_punkte": 0,
  "max_punkte": ${maxPunkte}
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
            { type: 'text', text: 'Korrigiere diese Schuelerarbeit. Vergleiche genau mit den Loesungen. Leere Felder = 0 Punkte.' },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
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

  return JSON.parse(content) as KorrekturResult;
}
