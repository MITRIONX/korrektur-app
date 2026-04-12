import request from 'supertest';
import { app } from '../../src/index';
import { query } from '../../src/db';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await query('DELETE FROM users');
  });

  it('creates a user and returns a token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'secret123', name: 'Test User' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects duplicate email with 409', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'secret123', name: 'First User' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'other123', name: 'Second User' });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await query('DELETE FROM users');
    // Seed a user for login tests
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login@example.com', password: 'correct-password', name: 'Login User' });
  });

  it('returns a token on valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({ email: 'login@example.com' });
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('rejects invalid password with 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});
