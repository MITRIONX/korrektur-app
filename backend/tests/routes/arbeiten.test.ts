import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Arbeiten routes', () => {
  let token: string;
  let klasseId: number;

  beforeAll(async () => {
    await query('DELETE FROM users');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'arbeiten@example.com', password: 'secret123', name: 'Arbeiten User' });
    token = res.body.token;
  });

  beforeEach(async () => {
    await query('DELETE FROM klassen');
    const res = await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '7a', schuljahr: '2025/2026' });
    klasseId = res.body.id;
  });

  describe('POST /api/arbeiten', () => {
    it('creates an assignment and returns 201 with correct fields', async () => {
      const res = await request(app)
        .post('/api/arbeiten')
        .set('Authorization', `Bearer ${token}`)
        .send({ klasse_id: klasseId, fach: 'Mathematik', titel: 'Klassenarbeit 1', max_punkte: 50 });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        fach: 'Mathematik',
        titel: 'Klassenarbeit 1',
        max_punkte: 50,
      });
      expect(res.body.status).toBe('entwurf');
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/arbeiten', () => {
    it('lists assignments filtered by klasse', async () => {
      await request(app)
        .post('/api/arbeiten')
        .set('Authorization', `Bearer ${token}`)
        .send({ klasse_id: klasseId, fach: 'Deutsch', titel: 'Aufsatz', max_punkte: 30 });

      await request(app)
        .post('/api/arbeiten')
        .set('Authorization', `Bearer ${token}`)
        .send({ klasse_id: klasseId, fach: 'Englisch', titel: 'Vokabeltest', max_punkte: 20 });

      const res = await request(app)
        .get(`/api/arbeiten?klasse_id=${klasseId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((a: { fach: string }) => a.fach)).toEqual(
        expect.arrayContaining(['Deutsch', 'Englisch'])
      );
    });
  });

  describe('PUT /api/arbeiten/:id', () => {
    it('updates the status of an assignment', async () => {
      const createRes = await request(app)
        .post('/api/arbeiten')
        .set('Authorization', `Bearer ${token}`)
        .send({ klasse_id: klasseId, fach: 'Physik', titel: 'Experiment', max_punkte: 40 });

      const arbeitId = createRes.body.id;

      const res = await request(app)
        .put(`/api/arbeiten/${arbeitId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'scannen' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('scannen');
    });
  });
});
