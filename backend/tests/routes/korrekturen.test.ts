import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('Korrekturen routes', () => {
  let token: string;

  beforeAll(async () => {
    await query('DELETE FROM users');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'korrekturen@example.com', password: 'secret123', name: 'Korrekturen User' });
    token = res.body.token;
  });

  describe('GET /api/scans/:scanId/korrektur', () => {
    it('returns 404 for non-existent scan', async () => {
      const res = await request(app)
        .get('/api/scans/99999/korrektur')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/korrekturen/:id', () => {
    it('returns 404 for non-existent korrektur', async () => {
      const res = await request(app)
        .put('/api/korrekturen/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ punkte: 10 });

      expect(res.status).toBe(404);
    });
  });
});
