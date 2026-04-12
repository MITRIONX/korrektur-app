import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Klassen routes', () => {
  let token: string;

  beforeAll(async () => {
    await query('DELETE FROM users');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'klassen@example.com', password: 'secret123', name: 'Klassen User' });
    token = res.body.token;
  });

  beforeEach(async () => {
    await query('DELETE FROM klassen');
  });

  describe('POST /api/klassen', () => {
    it('creates a class and returns 201 with correct fields', async () => {
      const res = await request(app)
        .post('/api/klassen')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '5a', schuljahr: '2025/2026' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: '5a', schuljahr: '2025/2026' });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('created_at');
    });

    it('rejects request without auth token with 401', async () => {
      const res = await request(app)
        .post('/api/klassen')
        .send({ name: '5b', schuljahr: '2025/2026' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/klassen', () => {
    it('lists only classes belonging to the current user', async () => {
      // Create two classes for our user
      await request(app)
        .post('/api/klassen')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '6a', schuljahr: '2025/2026' });
      await request(app)
        .post('/api/klassen')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '6b', schuljahr: '2025/2026' });

      const res = await request(app)
        .get('/api/klassen')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((k: { name: string }) => k.name)).toEqual(
        expect.arrayContaining(['6a', '6b'])
      );
    });
  });
});
