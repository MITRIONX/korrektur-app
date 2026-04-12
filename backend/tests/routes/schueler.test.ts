import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Schueler routes', () => {
  let token: string;
  let klasseId: number;

  beforeAll(async () => {
    await query('DELETE FROM users');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'schueler@example.com', password: 'secret123', name: 'Schueler User' });
    token = res.body.token;
  });

  beforeEach(async () => {
    await query('DELETE FROM klassen');
    const res = await request(app)
      .post('/api/klassen')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '5a', schuljahr: '2025/2026' });
    klasseId = res.body.id;
  });

  describe('POST /api/klassen/:klasseId/schueler', () => {
    it('adds a student to a class and returns 201 with correct fields', async () => {
      const res = await request(app)
        .post(`/api/klassen/${klasseId}/schueler`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vorname: 'Max', nachname: 'Mustermann' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        vorname: 'Max',
        nachname: 'Mustermann',
        klasse_id: klasseId,
      });
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/klassen/:klasseId/schueler', () => {
    it('lists students of a class', async () => {
      await request(app)
        .post(`/api/klassen/${klasseId}/schueler`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vorname: 'Anna', nachname: 'Becker' });
      await request(app)
        .post(`/api/klassen/${klasseId}/schueler`)
        .set('Authorization', `Bearer ${token}`)
        .send({ vorname: 'Tom', nachname: 'Auer' });

      const res = await request(app)
        .get(`/api/klassen/${klasseId}/schueler`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      // ordered by nachname, vorname: Auer before Becker
      expect(res.body[0].nachname).toBe('Auer');
      expect(res.body[1].nachname).toBe('Becker');
    });
  });
});
