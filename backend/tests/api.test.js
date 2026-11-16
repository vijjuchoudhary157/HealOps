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

describe('Incident Management & Alertmanager Webhook Flow', () => {
  const webhookToken = process.env.ALERTMANAGER_WEBHOOK_TOKEN || 'HealOps_Alertmanager_Token_Secured_2026_x87b';
  let userToken = '';
  let incidentId = null;
  const testFingerprint = 'fp-test-1234567890';

  beforeAll(async () => {
    // Login to get userToken for incident API
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    userToken = res.body.token;
  });

  describe('Webhook Authentication & Validation', () => {
    it('POST /api/incidents/webhook should reject requests without Authorization header (401)', async () => {
      const res = await request(app)
        .post('/api/incidents/webhook')
        .send({ alerts: [] });
      expect(res.statusCode).toEqual(401);
      expect(res.body.error.message).toContain('Unauthorized');
    });

    it('POST /api/incidents/webhook should reject requests with invalid bearer token (403)', async () => {
      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .send({ alerts: [] });
      expect(res.statusCode).toEqual(403);
      expect(res.body.error.message).toContain('Forbidden');
    });

    it('POST /api/incidents/webhook should reject malformed payloads missing alerts array (400)', async () => {
      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({ invalid: 'payload' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error.message).toContain('Bad Request');
    });
  });

  describe('Webhook Alert Processing & Idempotency', () => {
    it('should ingest firing alert and create new incident with timeline event', async () => {
      const payload = {
        receiver: 'healops-backend-webhook',
        status: 'firing',
        alerts: [{
          status: 'firing',
          fingerprint: testFingerprint,
          labels: {
            alertname: 'BackendUnavailable',
            severity: 'critical',
            component: 'backend',
            namespace: 'healops'
          },
          annotations: {
            summary: 'HealOps Backend instance is unavailable',
            description: 'Target is down'
          },
          startsAt: '2026-11-15T11:00:00Z',
          endsAt: '0001-01-01T00:00:00Z'
        }]
      };

      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.processed).toBe(1);

      // Verify in DB via GET /api/incidents
      const listRes = await request(app)
        .get('/api/incidents?status=firing')
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.statusCode).toEqual(200);
      const found = listRes.body.incidents.find(i => i.fingerprint === testFingerprint);
      expect(found).toBeDefined();
      expect(found.alertname).toBe('BackendUnavailable');
      expect(found.severity).toBe('critical');
      expect(found.status).toBe('firing');
      incidentId = found.id;
    });

    it('should idempotently handle duplicate/retried firing alert without creating duplicate incidents or events', async () => {
      const payload = {
        receiver: 'healops-backend-webhook',
        status: 'firing',
        alerts: [{
          status: 'firing',
          fingerprint: testFingerprint,
          labels: {
            alertname: 'BackendUnavailable',
            severity: 'critical',
            component: 'backend'
          },
          annotations: {
            summary: 'HealOps Backend instance is unavailable',
            description: 'Target is still down'
          },
          startsAt: '2026-11-15T11:05:00Z',
          endsAt: '0001-01-01T00:00:00Z'
        }]
      };

      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);

      // Check incident details and timeline count
      const detailRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detailRes.statusCode).toEqual(200);
      expect(detailRes.body.incident.status).toBe('firing');
      // Timeline should only have the initial firing event, not a duplicate
      expect(detailRes.body.timeline.length).toBe(1);
    });

    it('should handle resolved alert notification and mark incident resolved', async () => {
      const payload = {
        receiver: 'healops-backend-webhook',
        status: 'resolved',
        alerts: [{
          status: 'resolved',
          fingerprint: testFingerprint,
          labels: {
            alertname: 'BackendUnavailable',
            severity: 'critical'
          },
          annotations: {
            summary: 'HealOps Backend instance is unavailable'
          },
          startsAt: '2026-11-15T11:00:00Z',
          endsAt: '2026-11-15T11:10:00Z'
        }]
      };

      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);

      const detailRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detailRes.statusCode).toEqual(200);
      expect(detailRes.body.incident.status).toBe('resolved');
      expect(detailRes.body.incident.resolved_at).not.toBeNull();
      expect(detailRes.body.timeline.length).toBe(2);
      expect(detailRes.body.timeline[1].event_type).toBe('resolved');
    });

    it('should reopen a previously resolved incident if the same fingerprint fires again', async () => {
      const payload = {
        receiver: 'healops-backend-webhook',
        status: 'firing',
        alerts: [{
          status: 'firing',
          fingerprint: testFingerprint,
          labels: {
            alertname: 'BackendUnavailable',
            severity: 'critical'
          },
          annotations: {
            summary: 'HealOps Backend instance is unavailable again'
          },
          startsAt: '2026-11-15T11:20:00Z',
          endsAt: '0001-01-01T00:00:00Z'
        }]
      };

      const res = await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);

      const detailRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detailRes.statusCode).toEqual(200);
      expect(detailRes.body.incident.status).toBe('firing');
      expect(detailRes.body.incident.resolved_at).toBeNull();
      expect(detailRes.body.timeline.length).toBe(3);
      expect(detailRes.body.timeline[2].event_type).toBe('reopened');
    });

    it('should handle simultaneous concurrent duplicate firing alerts without duplicate incidents or events', async () => {
      const concurrentFp = 'fp-concurrent-' + Date.now();
      const payload = {
        receiver: 'healops-backend-webhook',
        status: 'firing',
        alerts: [{
          status: 'firing',
          fingerprint: concurrentFp,
          labels: {
            alertname: 'HighCPUThrottling',
            severity: 'warning',
            component: 'infrastructure'
          },
          annotations: {
            summary: 'Concurrent throttling test'
          },
          startsAt: new Date().toISOString()
        }]
      };

      // Fire 5 requests simultaneously
      const responses = await Promise.all([
        request(app).post('/api/incidents/webhook').set('Authorization', `Bearer ${webhookToken}`).send(payload),
        request(app).post('/api/incidents/webhook').set('Authorization', `Bearer ${webhookToken}`).send(payload),
        request(app).post('/api/incidents/webhook').set('Authorization', `Bearer ${webhookToken}`).send(payload),
        request(app).post('/api/incidents/webhook').set('Authorization', `Bearer ${webhookToken}`).send(payload),
        request(app).post('/api/incidents/webhook').set('Authorization', `Bearer ${webhookToken}`).send(payload)
      ]);

      for (const r of responses) {
        expect(r.statusCode).toEqual(200);
      }

      // Check DB: exactly 1 incident with concurrentFp
      const checkRes = await request(app)
        .get(`/api/incidents?search=${concurrentFp}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(checkRes.statusCode).toEqual(200);
      const matches = checkRes.body.incidents.filter(i => i.fingerprint === concurrentFp);
      expect(matches.length).toBe(1);

      // Check timeline: exactly 1 event (initial firing)
      const detailRes = await request(app)
        .get(`/api/incidents/${matches[0].id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detailRes.body.timeline.length).toBe(1);
      expect(detailRes.body.timeline[0].event_type).toBe('firing');
    });

    it('should keep acknowledged status when duplicate firing alerts arrive', async () => {
      const ackFp = 'fp-ack-test-' + Date.now();
      // 1. Create incident
      await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({
          alerts: [{
            status: 'firing',
            fingerprint: ackFp,
            labels: { alertname: 'HighAPILatency', severity: 'warning' },
            annotations: { summary: 'Latency test' },
            startsAt: new Date().toISOString()
          }]
        });

      const findRes = await request(app)
        .get(`/api/incidents?search=${ackFp}`)
        .set('Authorization', `Bearer ${userToken}`);
      const ackIncidentId = findRes.body.incidents[0].id;

      // 2. Acknowledge it
      const ackRes = await request(app)
        .patch(`/api/incidents/${ackIncidentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'acknowledged' });
      expect(ackRes.body.incident.status).toBe('acknowledged');

      // 3. Send duplicate firing alert
      await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({
          alerts: [{
            status: 'firing',
            fingerprint: ackFp,
            labels: { alertname: 'HighAPILatency', severity: 'warning' },
            annotations: { summary: 'Latency test repeat' },
            startsAt: new Date().toISOString()
          }]
        });

      // 4. Verify status is STILL acknowledged
      const checkRes = await request(app)
        .get(`/api/incidents/${ackIncidentId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(checkRes.body.incident.status).toBe('acknowledged');
      // Timeline should only have firing and acknowledged events
      expect(checkRes.body.timeline.map(e => e.event_type)).toEqual(['firing', 'acknowledged']);
    });

    it('should correctly resolve an acknowledged incident upon receiving a resolved notification', async () => {
      const ackResFp = 'fp-ack-resolve-' + Date.now();
      // 1. Create and acknowledge
      await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({
          alerts: [{
            status: 'firing',
            fingerprint: ackResFp,
            labels: { alertname: 'PodRestartSpike', severity: 'critical' },
            annotations: { summary: 'Restart test' },
            startsAt: new Date().toISOString()
          }]
        });

      const findRes = await request(app)
        .get(`/api/incidents?search=${ackResFp}`)
        .set('Authorization', `Bearer ${userToken}`);
      const testId = findRes.body.incidents[0].id;

      await request(app)
        .patch(`/api/incidents/${testId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'acknowledged' });

      // 2. Send resolved notification
      await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({
          alerts: [{
            status: 'resolved',
            fingerprint: ackResFp,
            labels: { alertname: 'PodRestartSpike', severity: 'critical' },
            annotations: { summary: 'Restart test' },
            endsAt: new Date().toISOString()
          }]
        });

      // 3. Verify status transitioned to resolved
      const checkRes = await request(app)
        .get(`/api/incidents/${testId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(checkRes.body.incident.status).toBe('resolved');
      expect(checkRes.body.incident.resolved_at).not.toBeNull();
      expect(checkRes.body.timeline.map(e => e.event_type)).toEqual(['firing', 'acknowledged', 'resolved']);

      // 4. Send duplicate resolved notification -> should be no-op with no duplicate event
      await request(app)
        .post('/api/incidents/webhook')
        .set('Authorization', `Bearer ${webhookToken}`)
        .send({
          alerts: [{
            status: 'resolved',
            fingerprint: ackResFp,
            labels: { alertname: 'PodRestartSpike' },
            endsAt: new Date().toISOString()
          }]
        });

      const dupRes = await request(app)
        .get(`/api/incidents/${testId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(dupRes.body.timeline.map(e => e.event_type)).toEqual(['firing', 'acknowledged', 'resolved']);
    });
  });

  describe('Incident Management API Endpoints', () => {
    it('GET /api/incidents should support filtering by status and severity', async () => {
      const res = await request(app)
        .get('/api/incidents?status=firing&severity=critical')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.incidents).toBeInstanceOf(Array);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('PATCH /api/incidents/:id should allow acknowledging an incident', async () => {
      const res = await request(app)
        .patch(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'acknowledged' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.incident.status).toBe('acknowledged');

      const detailRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      const lastEvent = detailRes.body.timeline[detailRes.body.timeline.length - 1];
      expect(lastEvent.event_type).toBe('acknowledged');
    });

    it('GET /api/incidents/stats should return accurate status and severity counts', async () => {
      const res = await request(app)
        .get('/api/incidents/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('by_status');
      expect(res.body.by_status).toHaveProperty('acknowledged');
      expect(res.body).toHaveProperty('by_severity');
      expect(res.body.by_severity).toHaveProperty('critical');
    });
  });
});
