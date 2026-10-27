import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Express API Integration Tests', () => {
  it('GET /health returns 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/subjects returns 401 without Bearer token', async () => {
    const res = await request(app).get('/api/subjects');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/subjects returns 200 with mock auth token in dev mode', async () => {
    const res = await request(app)
      .get('/api/subjects')
      .set('Authorization', 'Bearer mock-test-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/analytics/dashboard returns 200 with valid metrics structure', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer mock-test-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_subjects');
    expect(res.body.data).toHaveProperty('total_assessments');
    expect(res.body.data).toHaveProperty('overall_percentage');
    expect(res.body.data).toHaveProperty('recent_assessments');
  });

  it('GET /api/ai-advisor/status returns 200 with advisor feature flags', async () => {
    const res = await request(app)
      .get('/api/ai-advisor/status')
      .set('Authorization', 'Bearer mock-test-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('features');
  });

  it('POST /api/assessments rejects marks_obtained > max_marks with 400', async () => {
    const res = await request(app)
      .post('/api/assessments')
      .set('Authorization', 'Bearer mock-test-token')
      .send({
        subject_id: '11111111-1111-1111-1111-111111111111',
        title: 'Impossible Test',
        assessment_type: 'Quiz',
        assessment_date: '2026-10-20',
        marks_obtained: 110,
        max_marks: 100,
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for nonexistent route', async () => {
    const res = await request(app).get('/api/nonexistent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
