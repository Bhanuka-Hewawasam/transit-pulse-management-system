import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { database, nextId } from './database.js';
import type { Booking, Driver, Feedback, Passenger, Payment, Route, Vehicle } from '../../src/types/index.js';
import { mongodbContent, mongodbHealth, mongodbPassengerReviews } from './mongodbAdapter.js';
import { oracleCreate, oracleHealth, oracleList, oracleReport, oracleUpdate, oracleUpdateTripStatus } from './oracleAdapter.js';

const app = express();
app.use(cors());
app.use(express.json());

const required = (body: Record<string, unknown>, fields: string[]): string | null => {
  const missing = fields.find((field) => body[field] === undefined || body[field] === null || body[field] === '');
  return missing ? `${missing} is required` : null;
};

const list = (name: keyof typeof database) => async (_request: Request, response: Response) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    return response.json(await oracleList(name));
  }
  if (process.env.DATABASE_MODE === 'demo') return response.json(database[name]);
  return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using data endpoints.' });
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
app.get('/api/health/databases', async (_request, response) => response.json({
  mode: process.env.DATABASE_MODE === 'oracle' ? 'oracle' : 'demo',
  oracle: await oracleHealth(),
  mongodb: await mongodbHealth(),
}));
app.get('/api/mongodb/content', async (_request, response) => {
  const health = await mongodbHealth();
  if (health.connected) return response.json({ demo: false, ...(await mongodbContent()) });
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent());
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/reviews', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).reviews);
  if (process.env.DATABASE_MODE === 'demo') return response.json(database.feedback);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/reviews/route/:routeId', async (request, response) => {
  const health = await mongodbHealth();
  if (!health.connected && process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
  const content = health.connected ? (await mongodbContent()).reviews : database.feedback;
  response.json(content.filter((review) => String((review as { routeCode?: unknown }).routeCode) === request.params.routeId));
});
app.get('/api/mongodb/announcements', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).announcements);
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().announcements);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/documents', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).documents);
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().documents);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/media', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).media);
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().media);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});

function create<T extends { id: number }>(collection: T[], body: Record<string, unknown>, fields: string[], transform: (id: number) => T): void | never {
  const error = required(body, fields);
  if (error) throw Object.assign(new Error(error), { statusCode: 400 });
  collection.push(transform(nextId(collection)));
}

const createEndpoint = <T extends { id: number }>(resource: keyof typeof database, collection: T[], fields: string[], transform: (id: number, body: Record<string, unknown>) => T) => async (request: Request, response: Response, next: NextFunction) => {
  try {
    if (process.env.DATABASE_MODE === 'oracle') {
      const error = required(request.body, fields);
      if (error) return response.status(400).json({ error });
      return response.status(201).json(await oracleCreate(resource, request.body));
    }
    if (process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using data endpoints.' });
    create(collection, request.body, fields, (id) => transform(id, request.body));
    return response.status(201).json(collection.at(-1));
  } catch (error) { return next(error); }
};

app.post('/api/vehicles', createEndpoint('vehicles', database.vehicles, ['registrationNumber', 'make', 'model'], (id, body) => ({ id, ...body } as Vehicle)));
app.post('/api/drivers', createEndpoint('drivers', database.drivers, ['firstName', 'lastName', 'licenseNumber', 'licenseExpiry'], (id, body) => ({ id, ...body } as Driver)));
app.post('/api/routes', createEndpoint('routes', database.routes, ['routeCode', 'origin', 'destination', 'distanceKm', 'estimatedMinutes', 'fareAmount'], (id, body) => ({ id, ...body, stops: body.stops ?? [], isActive: body.isActive !== false } as Route)));
app.post('/api/passengers', createEndpoint('passengers', database.passengers, ['firstName', 'lastName', 'email', 'passportOrNic'], (id, body) => ({ id, ...body } as Passenger)));
app.post('/api/trips', createEndpoint('trips', database.trips, ['routeId', 'vehicleId', 'driverId', 'departureTime', 'arrivalTime', 'availableSeats', 'totalSeats'], (id, body) => ({ id, ...body } as unknown as typeof database.trips[number])));
app.post('/api/bookings', createEndpoint('bookings', database.bookings, ['tripId', 'passengerId', 'seatNumber', 'amount'], (id, body) => ({ id, ...body } as Booking)));
app.post('/api/payments', createEndpoint('payments', database.payments, ['bookingId', 'amount', 'method'], (id, body) => ({ id, ...body } as Payment)));
app.post('/api/maintenance', createEndpoint('maintenance', database.maintenance, ['vehicleId', 'description', 'scheduledDate'], (id, body) => ({ id, ...body } as typeof database.maintenance[number])));
app.post('/api/feedback', createEndpoint('feedback', database.feedback, ['passengerId', 'tripId', 'driverId', 'vehicleId', 'rating', 'comment'], (id, body) => ({ id, ...body } as Feedback)));

app.patch('/api/trips/:id/status', async (request, response, next) => {
  const trip = database.trips.find((item) => item.id === Number(request.params.id));
  const allowed = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  if (!allowed.includes(request.body.status)) return response.status(400).json({ error: 'Invalid trip status' });
  if (process.env.DATABASE_MODE === 'oracle') {
    try {
      const updated = await oracleUpdateTripStatus(Number(request.params.id), request.body.status);
      return updated ? response.json(updated) : response.status(404).json({ error: 'Trip not found' });
    } catch (error) { return next(error); }
  }
  if (process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using data endpoints.' });
  if (!trip) return response.status(404).json({ error: 'Trip not found' });
  trip.status = request.body.status;
  return response.json(trip);
});

const updateEndpoint = <T extends { id: number }>(resource: keyof typeof database, collection: T[], fields: string[]) => async (request: Request, response: Response, next: NextFunction) => {
  const id = Number(request.params.id);
  if (!Number.isInteger(id)) return response.status(400).json({ error: 'Record id must be an integer' });
  const validationError = required(request.body, fields);
  if (validationError) return response.status(400).json({ error: validationError });
  if (process.env.DATABASE_MODE === 'oracle') {
    try {
      const updated = await oracleUpdate(resource, id, request.body);
      return updated ? response.json(updated) : response.status(404).json({ error: 'Record not found' });
    } catch (error) { return next(error); }
  }
  if (process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using data endpoints.' });
  const record = collection.find((item) => item.id === id);
  if (!record) return response.status(404).json({ error: 'Record not found' });
  Object.assign(record, request.body);
  return response.json(record);
};

app.patch('/api/vehicles/:id', updateEndpoint('vehicles', database.vehicles, ['registrationNumber', 'make', 'model', 'year', 'capacity']));
app.patch('/api/drivers/:id', updateEndpoint('drivers', database.drivers, ['firstName', 'lastName', 'licenseNumber', 'licenseExpiry']));
app.patch('/api/routes/:id', updateEndpoint('routes', database.routes, ['routeCode', 'origin', 'destination', 'distanceKm', 'estimatedMinutes', 'fareAmount']));
app.patch('/api/passengers/:id', updateEndpoint('passengers', database.passengers, ['firstName', 'lastName', 'email', 'passportOrNic']));
app.patch('/api/trips/:id', updateEndpoint('trips', database.trips, ['routeId', 'vehicleId', 'driverId', 'departureTime', 'arrivalTime', 'availableSeats', 'totalSeats']));
app.patch('/api/bookings/:id', updateEndpoint('bookings', database.bookings, ['tripId', 'passengerId', 'seatNumber', 'amount']));
app.patch('/api/payments/:id', updateEndpoint('payments', database.payments, ['bookingId', 'amount']));
app.patch('/api/maintenance/:id', updateEndpoint('maintenance', database.maintenance, ['vehicleId', 'description', 'scheduledDate']));
app.patch('/api/feedback/:id', updateEndpoint('feedback', database.feedback, ['passengerId', 'tripId', 'driverId', 'vehicleId', 'rating', 'comment']));

app.use('/api/reports', (_request, response, next) => {
  if (process.env.DATABASE_MODE === 'demo') return next();
  if (process.env.DATABASE_MODE === 'oracle') return next();
  return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using data endpoints.' });
});

app.get('/api/reports/most-used-routes', async (request, response, next) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try { return response.json(await oracleReport('most-used-routes', { topN: request.query.topN })); }
    catch (error) { return next(error); }
  }
  const counts = new Map<number, number>();
  database.bookings.filter((booking) => booking.status !== 'cancelled').forEach((booking) => {
    const trip = database.trips.find((candidate) => candidate.id === booking.tripId);
    if (trip) counts.set(trip.routeId, (counts.get(trip.routeId) ?? 0) + 1);
  });
  response.json([...counts.entries()].map(([routeId, bookingCount]) => ({ route: database.routes.find((route) => route.id === routeId), bookingCount })).sort((a, b) => b.bookingCount - a.bookingCount));
});
app.get('/api/reports/revenue', async (request, response, next) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try { return response.json(await oracleReport('revenue', { fromDate: request.query.fromDate, toDate: request.query.toDate })); }
    catch (error) { return next(error); }
  }
  const totals = new Map<string, number>();
  database.payments.filter((payment) => payment.status === 'paid' && payment.paymentDate).forEach((payment) => {
    const period = payment.paymentDate?.slice(0, 7);
    if (period) totals.set(period, (totals.get(period) ?? 0) + payment.amount);
  });
  response.json([...totals].map(([period, revenue]) => ({ period, revenue })));
});
app.get('/api/reports/passenger-history', async (request, response, next) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try { return response.json(await oracleReport('passenger-history', { passengerId: request.query.passengerId })); }
    catch (error) { return next(error); }
  }
  const passengerId = Number(request.query.passengerId);
  if (!Number.isInteger(passengerId)) return response.status(400).json({ error: 'passengerId must be an integer' });
  response.json(database.bookings.filter((booking) => booking.passengerId === passengerId));
});
app.get('/api/reports/maintenance-due', async (request, response, next) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try { return response.json(await oracleReport('maintenance-due', { daysAhead: request.query.daysAhead })); }
    catch (error) { return next(error); }
  }
  return response.json(database.maintenance.filter((record) => record.status === 'overdue' || record.status === 'in_progress'));
});
app.get('/api/reports/performance', async (_request, response, next) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    try { return response.json(await oracleReport('performance')); }
    catch (error) { return next(error); }
  }
  return response.json(database.drivers.map((driver) => ({ driver, feedbackCount: database.feedback.filter((item) => item.driverId === driver.id).length })).sort((a, b) => b.driver.rating - a.driver.rating));
});

app.get('/api/reports/route-revenue-ratings', async (_request, response, next) => {
  if (process.env.DATABASE_MODE !== 'oracle') {
    const reviewsByRoute = new Map<number, { total: number; count: number }>();
    for (const review of database.feedback) {
      const trip = database.trips.find((candidate) => candidate.id === review.tripId);
      if (trip) {
        const aggregate = reviewsByRoute.get(trip.routeId) ?? { total: 0, count: 0 };
        aggregate.total += review.rating;
        aggregate.count += 1;
        reviewsByRoute.set(trip.routeId, aggregate);
      }
    }
    return response.json(database.routes.map((route) => {
      const paidRevenue = database.payments.filter((payment) => payment.status === 'paid').reduce((total, payment) => {
        const booking = database.bookings.find((candidate) => candidate.id === payment.bookingId);
        const trip = booking && database.trips.find((candidate) => candidate.id === booking.tripId);
        return trip?.routeId === route.id ? total + payment.amount : total;
      }, 0);
      const aggregate = reviewsByRoute.get(route.id);
      return { routeId: route.id, routeCode: route.routeCode, origin: route.origin, destination: route.destination,
        paidRevenue, averageReviewRating: aggregate ? aggregate.total / aggregate.count : null, reviewCount: aggregate?.count ?? 0 };
    }));
  }
  try {
    const [revenueRows, health] = await Promise.all([oracleReport('route-revenue-ratings'), mongodbHealth()]);
    const reviews = health.connected ? await mongodbPassengerReviews() : [];
    const routeIdsByCode = new Map(revenueRows.map((row) => [String(row.routeCode), Number(row.routeId)]));
    const ratingsByRoute = new Map<number, { total: number; count: number }>();
    for (const review of reviews) {
      const routeCode = String(review.routeCode ?? review.route_code ?? '');
      const routeId = Number(review.routeId ?? review.route_id ?? routeIdsByCode.get(routeCode));
      const rating = Number(review.rating);
      if (!Number.isInteger(routeId) || !Number.isFinite(rating)) continue;
      const aggregate = ratingsByRoute.get(routeId) ?? { total: 0, count: 0 };
      aggregate.total += rating;
      aggregate.count += 1;
      ratingsByRoute.set(routeId, aggregate);
    }
    return response.json(revenueRows.map((row) => {
      const aggregate = ratingsByRoute.get(Number(row.routeId));
      return { ...row, averageReviewRating: aggregate ? aggregate.total / aggregate.count : null, reviewCount: aggregate?.count ?? 0,
        reviewSourceAvailable: health.connected };
    }));
  } catch (error) { return next(error); }
});

app.use((_request, response) => response.status(404).json({ error: 'Endpoint not found' }));
app.use((error: Error & { statusCode?: number; errorNum?: number; code?: string }, _request: Request, response: Response, _next: NextFunction) => {
  const oracleCode = error.code?.match(/ORA-(\d{5})/)?.[1] ?? String(error.errorNum ?? '');
  if (/^20\d{3}$/.test(oracleCode)) {
    const message = error.message.split(/\r?\n/, 1)[0].replace(/^ORA-20\d{3}:\s*/, '');
    return response.status(400).json({ error: message });
  }
  const undeclaredIdentifier = error.message.match(/PLS-00201:\s*identifier '([A-Za-z0-9_$#]+)' must be declared/);
  if (oracleCode === '06550' && undeclaredIdentifier) {
    const procedureName = undeclaredIdentifier[1];
    const detail = `PLS-00201: identifier '${procedureName}' must be declared`;
    console.error(`Oracle request failed with ORA-06550: ${detail}`);
    return response.status(500).json({
      error: `Oracle procedure ${procedureName} is missing or not visible to the application schema. Run database/oracle/07_report_procedures.sql in that schema.`,
      code: 'ORA-06550',
      detail,
    });
  }
  if (oracleCode === '00001') return response.status(409).json({ error: 'A record with one of these unique values already exists.' });
  if (oracleCode === '02291') return response.status(400).json({ error: 'A referenced record does not exist. Check the supplied foreign-key IDs.' });
  if (oracleCode === '02292') return response.status(409).json({ error: 'This record is still referenced by another record.' });
  if (oracleCode === '00942') return response.status(500).json({ error: 'An Oracle table is missing. Run database/oracle/01_create_tables.sql as SYSTEM.' });
  if (oracleCode === '02289') return response.status(500).json({ error: 'An Oracle sequence is missing. Run database/oracle/03_sequences.sql as SYSTEM.' });
  if (oracleCode === '01017') return response.status(503).json({ error: 'Oracle login failed. Check ORACLE_USER and ORACLE_PASSWORD in the backend environment.' });
  if (/^(12154|12514|12541|12170|03113|03114|12545)$/.test(oracleCode) || error.code?.startsWith('NJS-') || error.code?.startsWith('DPI-') || error.message.includes('Oracle credentials are not configured')) {
    return response.status(503).json({ error: 'Oracle is unavailable. Check the backend connection settings and database service.' });
  }
  if (oracleCode) {
    const message = `Oracle request failed with ORA-${oracleCode}. See server diagnostics for details.`;
    console.error(message);
    return response.status(500).json({ error: message, code: `ORA-${oracleCode}` });
  }
  return response.status(error.statusCode ?? 500).json({ error: error.message || 'Internal server error' });
});

export default app;
