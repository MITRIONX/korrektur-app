import path from 'path';
import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Scans routes', () => {
  let token: string;
  let klasseId: number;
  let arbeitId: number;
  let schuelerId: number;

  beforeAll(async () => {
    await query('DELETE FROM users');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'scans@example.com', password: 'secret123', name: 'Scans User' });
    token = res.body.token;
  });

  beforeEach(async () => {
    await query('DELETE FROM klassen');

    // Create a klasse
    const klasseRes = await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '8a', schuljahr: '2025/2026' });
    klasseId = klasseRes.body.id;

    // Create an arbeit
    const arbeitRes = await request(app)
      .post('/api/arbeiten')
      .set('Authorization', `Bearer ${token}`)
      .send({ klasse_id: klasseId, fach: 'Mathematik', titel: 'Test', max_punkte: 100 });
    arbeitId = arbeitRes.body.id;

    // Create a schueler
    const schuelerResult = await query(
      `INSERT INTO schueler (klasse_id, vorname, nachname) VALUES ($1, $2, $3) RETURNING id`,
      [klasseId, 'Anna', 'Schmidt']
    );
    schuelerId = schuelerResult.rows[0].id;
  });

  describe('POST /api/arbeiten/:arbeitId/scans', () => {
    it('uploads a scan and returns 201 with correct fields', async () => {
      const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-scan.jpg');

      const res = await request(app)
        .post(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`)
        .field('schueler_id', String(schuelerId))
        .field('seiten_nr', '1')
        .attach('bild', testImagePath);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        arbeit_id: arbeitId,
        schueler_id: schuelerId,
        seiten_nr: 1,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('bild_pfad');
      expect(res.body).toHaveProperty('qr_code');
      expect(res.body.qr_code).toBe(
        `korrektur://arbeit/${arbeitId}/schueler/${schuelerId}/seite/1`
      );
    });

    it('returns 400 when schueler_id is missing', async () => {
      const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-scan.jpg');

      const res = await request(app)
        .post(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`)
        .field('seiten_nr', '1')
        .attach('bild', testImagePath);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 when arbeit does not belong to user', async () => {
      const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-scan.jpg');

      const res = await request(app)
        .post('/api/arbeiten/99999/scans')
        .set('Authorization', `Bearer ${token}`)
        .field('schueler_id', String(schuelerId))
        .field('seiten_nr', '1')
        .attach('bild', testImagePath);

      expect(res.status).toBe(404);
    });

    it('upserts on conflict (same arbeit_id, schueler_id, seiten_nr)', async () => {
      const testImagePath = path.join(__dirname, '..', 'fixtures', 'test-scan.jpg');

      const res1 = await request(app)
        .post(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`)
        .field('schueler_id', String(schuelerId))
        .field('seiten_nr', '1')
        .attach('bild', testImagePath);
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`)
        .field('schueler_id', String(schuelerId))
        .field('seiten_nr', '1')
        .attach('bild', testImagePath);
      expect(res2.status).toBe(201);
      expect(res2.body.id).toBe(res1.body.id);
    });
  });

  describe('GET /api/arbeiten/:arbeitId/scans', () => {
    it('lists scans for an arbeit with schueler name fields', async () => {
      await query(
        `INSERT INTO scan_seiten (arbeit_id, schueler_id, seiten_nr, bild_pfad, qr_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [arbeitId, schuelerId, 1, '/tmp/test.jpg', `korrektur://arbeit/${arbeitId}/schueler/${schuelerId}/seite/1`]
      );

      const res = await request(app)
        .get(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        arbeit_id: arbeitId,
        schueler_id: schuelerId,
        seiten_nr: 1,
        vorname: 'Anna',
        nachname: 'Schmidt',
      });
    });

    it('returns empty array when no scans exist', async () => {
      const res = await request(app)
        .get(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 404 when arbeit does not belong to user', async () => {
      const res = await request(app)
        .get('/api/arbeiten/99999/scans')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('orders scans by nachname, vorname, seiten_nr', async () => {
      // Add second schueler
      const schueler2Result = await query(
        `INSERT INTO schueler (klasse_id, vorname, nachname) VALUES ($1, $2, $3) RETURNING id`,
        [klasseId, 'Bernd', 'Auer']
      );
      const schuelerId2 = schueler2Result.rows[0].id;

      await query(
        `INSERT INTO scan_seiten (arbeit_id, schueler_id, seiten_nr, bild_pfad, qr_code) VALUES
         ($1, $2, 2, '/tmp/a.jpg', 'qr1'),
         ($1, $2, 1, '/tmp/b.jpg', 'qr2'),
         ($1, $3, 1, '/tmp/c.jpg', 'qr3')`,
        [arbeitId, schuelerId, schuelerId2]
      );

      const res = await request(app)
        .get(`/api/arbeiten/${arbeitId}/scans`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      // Auer (schuelerId2) should come before Schmidt (schuelerId)
      expect(res.body[0].nachname).toBe('Auer');
      expect(res.body[1].nachname).toBe('Schmidt');
      expect(res.body[1].seiten_nr).toBe(1);
      expect(res.body[2].seiten_nr).toBe(2);
    });
  });
});
