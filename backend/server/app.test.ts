import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const oracleMocks = vi.hoisted(() => ({
  health: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateTripStatus: vi.fn(),
}));

vi.mock('./oracleAdapter.js', () => ({
  oracleHealth: oracleMocks.health,
  oracleList: oracleMocks.list,
  oracleCreate: oracleMocks.create,
  oracleUpdate: oracleMocks.update,
  oracleUpdateTripStatus: oracleMocks.updateTripStatus,
}));

import app from './app.js';

describe('SmartMove backend API', () => {
  beforeEach(() => {
    process.env.DATABASE_MODE = 'demo';
    vi.clearAllMocks();
    oracleMocks.health.mockResolvedValue({ database: 'Oracle', connected: false, mode: 'demo', message: 'Oracle configuration is incomplete' });
  });

  it('reports database health without affecting demo data mode', async () => {
    const response = await request(app).get('/api/health/databases');
    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('demo');
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

  it('reads vehicles from Oracle and does not use demo data after Oracle errors', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.list.mockRejectedValue(new Error('Oracle table unavailable'));

    const response = await request(app).get('/api/vehicles');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Oracle table unavailable');
    expect(oracleMocks.list).toHaveBeenCalledWith('vehicles');
  });

  it('reports Oracle as the active mode when DATABASE_MODE is oracle', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.health.mockResolvedValue({ database: 'Oracle', connected: true, mode: 'oracle', message: 'Oracle connection is healthy' });

    const response = await request(app).get('/api/health/databases');

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('oracle');
    expect(response.body.oracle.connected).toBe(true);
  });

  it('inserts vehicles through Oracle and returns the inserted row', async () => {
    process.env.DATABASE_MODE = 'oracle';
    const vehicle = { id: 41, registrationNumber: 'TEST-0041', make: 'Tata', model: 'Starbus' };
    oracleMocks.create.mockResolvedValue(vehicle);

    const response = await request(app).post('/api/vehicles').send(vehicle);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(vehicle);
    expect(oracleMocks.create).toHaveBeenCalledWith('vehicles', expect.objectContaining({ registrationNumber: 'TEST-0041' }));
  });

  it.each([
    ['/api/drivers', 'drivers', { firstName: 'Test', lastName: 'Driver', licenseNumber: 'TEST-DRIVER', licenseExpiry: '2030-01-01' }],
    ['/api/routes', 'routes', { routeCode: 'TEST-ROUTE', origin: 'A', destination: 'B', distanceKm: 10, estimatedMinutes: 20, fareAmount: 50 }],
    ['/api/passengers', 'passengers', { firstName: 'Test', lastName: 'Passenger', email: 'test@example.com', passportOrNic: 'TEST-NIC' }],
    ['/api/trips', 'trips', { routeId: 1, vehicleId: 1, driverId: 1, departureTime: '2030-01-01T08:00', arrivalTime: '2030-01-01T09:00', availableSeats: 10, totalSeats: 10 }],
    ['/api/bookings', 'bookings', { tripId: 1, passengerId: 1, seatNumber: 'A1', amount: 50 }],
    ['/api/payments', 'payments', { bookingId: 1, amount: 50, method: 'cash' }],
    ['/api/maintenance', 'maintenance', { vehicleId: 1, description: 'Inspection', scheduledDate: '2030-01-01' }],
    ['/api/feedback', 'feedback', { passengerId: 1, tripId: 1, driverId: 1, vehicleId: 1, rating: 5, comment: 'Good service' }],
  ])('routes %s inserts to Oracle', async (path, resource, payload) => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.create.mockResolvedValue({ id: 9 });

    const response = await request(app).post(path).send(payload);

    expect(response.status).toBe(201);
    expect(oracleMocks.create).toHaveBeenCalledWith(resource, payload);
  });

  it.each([
    ['/api/vehicles/9', 'vehicles', { registrationNumber: 'TEST-9', make: 'Tata', model: 'Bus', year: 2024, capacity: 40 }],
    ['/api/drivers/9', 'drivers', { firstName: 'Test', lastName: 'Driver', licenseNumber: 'TEST-9', licenseExpiry: '2030-01-01' }],
    ['/api/routes/9', 'routes', { routeCode: 'TEST-9', origin: 'A', destination: 'B', distanceKm: 10, estimatedMinutes: 20, fareAmount: 50 }],
    ['/api/passengers/9', 'passengers', { firstName: 'Test', lastName: 'Passenger', email: 'test@example.com', passportOrNic: 'TEST-9' }],
    ['/api/trips/9', 'trips', { routeId: 1, vehicleId: 1, driverId: 1, departureTime: '2030-01-01T08:00', arrivalTime: '2030-01-01T09:00', availableSeats: 10, totalSeats: 10 }],
    ['/api/bookings/9', 'bookings', { tripId: 1, passengerId: 1, seatNumber: 'A1', amount: 50 }],
    ['/api/payments/9', 'payments', { bookingId: 1, amount: 50 }],
    ['/api/maintenance/9', 'maintenance', { vehicleId: 1, description: 'Inspection', scheduledDate: '2030-01-01' }],
    ['/api/feedback/9', 'feedback', { passengerId: 1, tripId: 1, driverId: 1, vehicleId: 1, rating: 5, comment: 'Good service' }],
  ])('routes %s updates to Oracle', async (path, resource, payload) => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.update.mockResolvedValue({ id: 9, ...payload });

    const response = await request(app).patch(path).send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 9, ...payload });
    expect(oracleMocks.update).toHaveBeenCalledWith(resource, 9, payload);
  });

  it('updates demo records and reports missing records', async () => {
    const current = (await request(app).get('/api/vehicles')).body[0];
    const update = { ...current, make: 'Updated Make' };

    const response = await request(app).patch(`/api/vehicles/${current.id}`).send(update);
    const missing = await request(app).patch('/api/vehicles/999999').send(update);

    expect(response.status).toBe(200);
    expect(response.body.make).toBe('Updated Make');
    expect(missing.status).toBe(404);
  });

  it('returns a clear duplicate-value error from Oracle', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.create.mockRejectedValue(Object.assign(new Error('unique constraint'), { code: 'ORA-00001', errorNum: 1 }));

    const response = await request(app).post('/api/vehicles').send({ registrationNumber: 'DUPLICATE', make: 'Tata', model: 'Bus' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/unique values already exists/);
  });
});
