import { KorrekturResult, KorrekturAufgabe } from '../../src/services/openai';

describe('KorrekturResult interface', () => {
  it('accepts a valid KorrekturResult with correct aufgaben', () => {
    const aufgabe: KorrekturAufgabe = {
      nummer: 1,
      erkannter_text: '4',
      bewertung: 'richtig',
      punkte: 2,
      max_punkte: 2,
      position: { x: 10, y: 20, w: 30, h: 5 },
      feedback: null,
    };

    const result: KorrekturResult = {
      aufgaben: [aufgabe],
      gesamt_punkte: 2,
      max_punkte: 10,
    };

    expect(result.aufgaben).toHaveLength(1);
    expect(result.aufgaben[0].nummer).toBe(1);
    expect(result.aufgaben[0].bewertung).toBe('richtig');
    expect(result.aufgaben[0].feedback).toBeNull();
    expect(result.gesamt_punkte).toBe(2);
    expect(result.max_punkte).toBe(10);
  });

  it('accepts aufgaben with all bewertung values', () => {
    const bewertungen: KorrekturAufgabe['bewertung'][] = ['richtig', 'falsch', 'teilweise'];

    bewertungen.forEach((bewertung) => {
      const aufgabe: KorrekturAufgabe = {
        nummer: 1,
        erkannter_text: 'Antwort',
        bewertung,
        punkte: 1,
        max_punkte: 2,
        position: { x: 0, y: 0, w: 100, h: 10 },
        feedback: bewertung !== 'richtig' ? 'Verbesserungshinweis' : null,
      };
      expect(aufgabe.bewertung).toBe(bewertung);
    });
  });

  it('accepts position values as percentages (0-100)', () => {
    const aufgabe: KorrekturAufgabe = {
      nummer: 1,
      erkannter_text: '7',
      bewertung: 'falsch',
      punkte: 0,
      max_punkte: 3,
      position: { x: 5, y: 50, w: 90, h: 8 },
      feedback: 'Die richtige Antwort ist 8.',
    };

    expect(aufgabe.position.x).toBeGreaterThanOrEqual(0);
    expect(aufgabe.position.x).toBeLessThanOrEqual(100);
    expect(aufgabe.position.y).toBeGreaterThanOrEqual(0);
    expect(aufgabe.position.y).toBeLessThanOrEqual(100);
    expect(aufgabe.position.w).toBeGreaterThanOrEqual(0);
    expect(aufgabe.position.w).toBeLessThanOrEqual(100);
    expect(aufgabe.position.h).toBeGreaterThanOrEqual(0);
    expect(aufgabe.position.h).toBeLessThanOrEqual(100);
  });

  it('accepts multiple aufgaben with cumulative scoring', () => {
    const aufgaben: KorrekturAufgabe[] = [
      {
        nummer: 1,
        erkannter_text: '12',
        bewertung: 'richtig',
        punkte: 4,
        max_punkte: 4,
        position: { x: 5, y: 5, w: 80, h: 10 },
        feedback: null,
      },
      {
        nummer: 2,
        erkannter_text: 'Berlin',
        bewertung: 'teilweise',
        punkte: 2,
        max_punkte: 4,
        position: { x: 5, y: 25, w: 80, h: 10 },
        feedback: 'Unvollstaendige Antwort.',
      },
      {
        nummer: 3,
        erkannter_text: 'blau',
        bewertung: 'falsch',
        punkte: 0,
        max_punkte: 2,
        position: { x: 5, y: 45, w: 80, h: 10 },
        feedback: 'Die richtige Antwort ist rot.',
      },
    ];

    const result: KorrekturResult = {
      aufgaben,
      gesamt_punkte: 6,
      max_punkte: 10,
    };

    expect(result.aufgaben).toHaveLength(3);
    const sumPunkte = result.aufgaben.reduce((sum, a) => sum + a.punkte, 0);
    expect(sumPunkte).toBe(result.gesamt_punkte);
  });
});
