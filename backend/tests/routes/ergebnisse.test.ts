import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Ergebnisse routes', () => {
  let token: string;
  let arbeitId: number;
  let shareToken: string;

  beforeAll(async () => {
    await query('DELETE FROM users');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ergebnisse@example.com', password: 'secret123', name: 'Ergebnisse User' });
    token = res.body.token;
  });

  beforeEach(async () => {
    await query('DELETE FROM klassen');

    // Create klasse
    const klasseRes = await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '9b', schuljahr: '2025/2026' });
    const klasseId = klasseRes.body.id;

    // Create arbeit
    const arbeitRes = await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({ klasse_id: klasseId, fach: 'Mathematik', titel: 'Test 1', max_punkte: 50 });
    arbeitId = arbeitRes.body.id;

    // Create a schueler
    const schuelerResult = await query(
      `INSERT INTO schueler (klasse_id, vorname, nachname) VALUES ($1, $2, $3) RETURNING id`,
      [klasseId, 'Anna', 'Schmidt']
    );
    const schuelerId = schuelerResult.rows[0].id;

    // Directly insert a result with a known share_token for the public endpoint tests
    shareToken = 'testsharetoken1234567890abcdef';
    await query(
      `INSERT INTO ergebnisse (arbeit_id, schueler_id, gesamt_punkte, max_punkte, share_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (arbeit_id, schueler_id)
       DO UPDATE SET gesamt_punkte = EXCLUDED.gesamt_punkte,
                     max_punkte    = EXCLUDED.max_punkte,
                     share_token   = EXCLUDED.share_token`,
      [arbeitId, schuelerId, 40, 50, shareToken]
    );
  });

  describe('GET /api/arbeiten/:id/ergebnisse', () => {
    it('returns results with stats for owned arbeit', async () => {
      const res = await request(app)
        .get(`/api/arbeiten/${arbeitId}/ergebnisse`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ergebnisse');
      expect(res.body).toHaveProperty('stats');
      expect(Array.isArray(res.body.ergebnisse)).toBe(true);
      expect(res.body.ergebnisse.length).toBeGreaterThan(0);

      const stats = res.body.stats;
      expect(stats).toHaveProperty('durchschnitt');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('anzahl');
      expect(stats.anzahl).toBeGreaterThan(0);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`/api/arbeiten/${arbeitId}/ergebnisse`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent arbeit', async () => {
      const res = await request(app)
        .get('/api/arbeiten/99999/ergebnisse')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/ergebnis/:shareToken', () => {
    it('returns result without auth', async () => {
      const res = await request(app).get(`/api/ergebnis/${shareToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vorname', 'Anna');
      expect(res.body).toHaveProperty('nachname', 'Schmidt');
      expect(res.body).toHaveProperty('fach', 'Mathematik');
      expect(res.body).toHaveProperty('titel', 'Test 1');
      expect(Number(res.body.gesamt_punkte)).toBe(40);
    });

    it('returns 404 for unknown token', async () => {
      const res = await request(app).get('/api/ergebnis/unknowntokenxyz');
      expect(res.status).toBe(404);
    });
  });
});
