const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db');
const { createTables, dropTables } = require('../src/db/init');

beforeAll(async () => {
  // Ensure we are hitting the test database
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run with NODE_ENV=test');
  }
  await dropTables();
  await createTables();
});

afterAll(async () => {
  await dropTables();
  await pool.end();
});

describe('System Endpoints', () => {
  it('GET /health should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /ready should return ready status when db is connected', async () => {
    const res = await request(app).get('/ready');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /metrics should return prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('http_requests_total');
  });
});

describe('Authentication & Tasks Flow', () => {
  let authToken = '';
  let taskId = '';
  const testUser = { email: 'test@example.com', password: 'password123' };

  it('POST /api/auth/register should create a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login should return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    authToken = res.body.token;
  });

  it('POST /api/tasks should create a task when authenticated', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Task',
        description: 'Test description',
        priority: 'high'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.task.title).toBe('Test Task');
    expect(res.body.task.status).toBe('pending');
    taskId = res.body.task.id;
  });

  it('GET /api/tasks should retrieve user tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.tasks.length).toBeGreaterThan(0);
    expect(res.body.tasks[0].id).toBe(taskId);
  });
});
