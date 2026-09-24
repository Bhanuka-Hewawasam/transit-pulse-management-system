import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './app.js';

describe('SmartMove backend fallback API', () => {
  it('reports demo database health when credentials are missing', async () => {
    const response = await request(app).get('/api/health/databases');
    expect(response.status).toBe(200);
    expect(response.body.oracle.mode).toBe('demo');
    expect(response.body.mongodb.mode).toBe('demo');
    expect(response.body.oracle.connected).toBe(false);
  });

  it('serves vehicles and reports', async () => {
    const vehicles = await request(app).get('/api/vehicles');
    const reports = await request(app).get('/api/reports/most-used-routes');
    expect(vehicles.status).toBe(200);
    expect(vehicles.body.length).toBeGreaterThan(0);
    expect(reports.status).toBe(200);
  });

  it('serves MongoDB-style demo content', async () => {
    const response = await request(app).get('/api/mongodb/content');
    expect(response.status).toBe(200);
    expect(response.body.demo).toBe(true);
    expect(response.body.reviews.length).toBeGreaterThan(0);
  });
});
