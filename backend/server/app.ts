import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { database, nextId } from './database.js';
import type { Booking, Driver, Feedback, Passenger, Payment, Route, Vehicle } from '../../src/types/index.js';
import { mongodbContent, mongodbHealth } from './mongodbAdapter.js';
import { oracleHealth, oracleList } from './oracleAdapter.js';

const app = express();
app.use(cors());
app.use(express.json());

const required = (body: Record<string, unknown>, fields: string[]): string | null => {
  const missing = fields.find((field) => body[field] === undefined || body[field] === null || body[field] === '');
  return missing ? `${missing} is required` : null;
};

const list = (name: keyof typeof database) => async (_request: Request, response: Response) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try {
      const health = await oracleHealth();
      if (health.connected) return response.json(await oracleList(name));
    } catch {
      // Fall through to the demo adapter when Oracle is unavailable.
    }
  }
  return response.json(database[name]);
};
app.get('/api/vehicles', list('vehicles'));
app.get('/api/drivers', list('drivers'));
app.get('/api/routes', list('routes'));
app.get('/api/passengers', list('passengers'));
app.get('/api/trips', list('trips'));
app.get('/api/bookings', list('bookings'));
app.get('/api/payments', list('payments'));
app.get('/api/maintenance', list('maintenance'));
app.get('/api/feedback', list('feedback'));
const demoMongoContent = () => ({
  demo: true,
  reviews: database.feedback,
  announcements: [{ id: 'announcement-1', title: 'Holiday timetable', detail: 'Extra Colombo to Kandy trips are available during the holiday period.', meta: 'Active announcement' }],
  documents: database.vehicles.slice(0, 3).map((vehicle) => ({ id: `document-${vehicle.id}`, title: `${vehicle.registrationNumber} · Insurance document`, detail: `${vehicle.make} ${vehicle.model} document record`, meta: `Expires ${vehicle.nextMaintenanceDate}` })),
  media: database.trips.slice(0, 3).map((trip) => ({ id: `media-${trip.id}`, title: `${trip.routeCode} trip media`, detail: `Photo/video reference for ${trip.origin} to ${trip.destination}`, meta: `${trip.vehicleReg ?? 'Vehicle'} · Demo media` })),
});
app.get('/api/health/oracle', async (_request, response) => response.json(await oracleHealth()));
app.get('/api/health/mongodb', async (_request, response) => response.json(await mongodbHealth()));
app.get('/api/health/databases', async (_request, response) => response.json({ oracle: await oracleHealth(), mongodb: await mongodbHealth() }));
app.get('/api/mongodb/content', async (_request, response) => {
  const health = await mongodbHealth();
  if (health.connected) return response.json({ demo: false, ...(await mongodbContent()) });
  return response.json(demoMongoContent());
});
app.get('/api/mongodb/reviews', async (_request, response) => response.json((await mongodbHealth()).connected ? (await mongodbContent()).reviews : database.feedback));
app.get('/api/mongodb/reviews/route/:routeId', async (request, response) => {
  const content = (await mongodbHealth()).connected ? (await mongodbContent()).reviews : database.feedback;
  response.json(content.filter((review) => String((review as { routeCode?: unknown }).routeCode) === request.params.routeId));
});
app.get('/api/mongodb/announcements', async (_request, response) => response.json((await mongodbHealth()).connected ? (await mongodbContent()).announcements : demoMongoContent().announcements));
app.get('/api/mongodb/documents', async (_request, response) => response.json((await mongodbHealth()).connected ? (await mongodbContent()).documents : demoMongoContent().documents));
app.get('/api/mongodb/media', async (_request, response) => response.json((await mongodbHealth()).connected ? (await mongodbContent()).media : demoMongoContent().media));

function create<T extends { id: number }>(collection: T[], body: Record<string, unknown>, fields: string[], transform: (id: number) => T): void | never {
  const error = required(body, fields);
  if (error) throw Object.assign(new Error(error), { statusCode: 400 });
  collection.push(transform(nextId(collection)));
}

app.post('/api/vehicles', (request, response, next) => {
  try { create(database.vehicles, request.body, ['registrationNumber', 'make', 'model'], (id) => ({ id, ...request.body } as Vehicle)); response.status(201).json(database.vehicles.at(-1)); } catch (error) { next(error); }
});
app.post('/api/drivers', (request, response, next) => {
  try { create(database.drivers, request.body, ['firstName', 'lastName', 'licenseNumber'], (id) => ({ id, ...request.body } as Driver)); response.status(201).json(database.drivers.at(-1)); } catch (error) { next(error); }
});
app.post('/api/routes', (request, response, next) => {
  try { create(database.routes, request.body, ['routeCode', 'origin', 'destination'], (id) => ({ id, ...request.body } as Route)); response.status(201).json(database.routes.at(-1)); } catch (error) { next(error); }
});
app.post('/api/passengers', (request, response, next) => {
  try { create(database.passengers, request.body, ['firstName', 'lastName', 'email'], (id) => ({ id, ...request.body } as Passenger)); response.status(201).json(database.passengers.at(-1)); } catch (error) { next(error); }
});
app.post('/api/bookings', (request, response, next) => {
  try { create(database.bookings, request.body, ['tripId', 'passengerId', 'seatNumber'], (id) => ({ id, ...request.body } as Booking)); response.status(201).json(database.bookings.at(-1)); } catch (error) { next(error); }
});
app.post('/api/payments', (request, response, next) => {
  try { create(database.payments, request.body, ['bookingId', 'amount', 'method'], (id) => ({ id, ...request.body } as Payment)); response.status(201).json(database.payments.at(-1)); } catch (error) { next(error); }
});
app.post('/api/feedback', (request, response, next) => {
  try { create(database.feedback, request.body, ['passengerId', 'tripId', 'rating', 'comment'], (id) => ({ id, ...request.body } as Feedback)); response.status(201).json(database.feedback.at(-1)); } catch (error) { next(error); }
});
app.patch('/api/trips/:id/status', (request, response) => {
  const trip = database.trips.find((item) => item.id === Number(request.params.id));
  const allowed = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  if (!trip) return response.status(404).json({ error: 'Trip not found' });
  if (!allowed.includes(request.body.status)) return response.status(400).json({ error: 'Invalid trip status' });
  trip.status = request.body.status;
  return response.json(trip);
});

app.get('/api/reports/most-used-routes', (_request, response) => {
  const counts = new Map<number, number>();
  database.bookings.filter((booking) => booking.status !== 'cancelled').forEach((booking) => {
    const trip = database.trips.find((candidate) => candidate.id === booking.tripId);
    if (trip) counts.set(trip.routeId, (counts.get(trip.routeId) ?? 0) + 1);
  });
  response.json([...counts.entries()].map(([routeId, bookingCount]) => ({ route: database.routes.find((route) => route.id === routeId), bookingCount })).sort((a, b) => b.bookingCount - a.bookingCount));
});
app.get('/api/reports/revenue', (_request, response) => {
  const totals = new Map<string, number>();
  database.payments.filter((payment) => payment.status === 'paid').forEach((payment) => totals.set(payment.paymentDate.slice(0, 7), (totals.get(payment.paymentDate.slice(0, 7)) ?? 0) + payment.amount));
  response.json([...totals].map(([period, revenue]) => ({ period, revenue })));
});
app.get('/api/reports/passenger-history', (request, response) => {
  const passengerId = Number(request.query.passengerId);
  if (!Number.isInteger(passengerId)) return response.status(400).json({ error: 'passengerId must be an integer' });
  response.json(database.bookings.filter((booking) => booking.passengerId === passengerId));
});
app.get('/api/reports/maintenance-due', (_request, response) => response.json(database.maintenance.filter((record) => record.status === 'overdue' || record.status === 'in_progress')));
app.get('/api/reports/performance', (_request, response) => response.json(database.drivers.map((driver) => ({ driver, feedbackCount: database.feedback.filter((item) => item.driverId === driver.id).length })).sort((a, b) => b.driver.rating - a.driver.rating)));

app.use((_request, response) => response.status(404).json({ error: 'Endpoint not found' }));
app.use((error: Error & { statusCode?: number }, _request: Request, response: Response, _next: NextFunction) => response.status(error.statusCode ?? 500).json({ error: error.message || 'Internal server error' }));

export default app;
