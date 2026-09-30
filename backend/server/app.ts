import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { database, nextId } from './database.js';
import { calculateSegmentFare, calculateTotalFare } from '../../src/utils/routeFare.js';
import type { Booking, Driver, Feedback, Passenger, Payment, PaymentMethod, Route, Trip, Vehicle } from '../../src/types/index.js';
import { mongodbContent, mongodbCreateAnnouncement, mongodbCreatePassengerReview, mongodbCreateTripMedia, mongodbCreateVehicleDocument, mongodbDeleteVehicleDocument, mongodbHealth, mongodbPassengerReviews, mongodbTripMediaImage, mongodbUpdateTripMediaStatus, mongodbUpdateVehicleDocument, type PassengerReviewInput, type TravelAnnouncementInput, type TripMediaStatus, type VehicleDocumentInput } from './mongodbAdapter.js';
import {
  oracleCreate, oracleHealth, oracleList, oraclePassengerBookSeat, oraclePassengerBookSeats, oraclePassengerBookings, oraclePassengerCancelBooking,
  oraclePassengerExists, oraclePassengerPayBooking, oraclePassengerPayBookings, oraclePassengerProfile, oraclePassengerSearchTrips,
  oraclePassengerSubmitFeedback, oraclePassengerUpdateProfile, oracleReport, oracleUpdate, oracleUpdateTripStatus,
  oracleDriverCompleteTrip, oracleDriverExists, oracleDriverFeedback, oracleDriverManifest, oracleDriverProfile,
  oracleDriverStartTrip, oracleDriverSummary, oracleDriverTrips, oracleDriverUpdateProfile, oracleDriverVehicle,
} from './oracleAdapter.js';

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
const demoAnnouncements: Record<string, unknown>[] = [{ id: 'announcement-1', type: 'announcement', title: 'Holiday timetable', message: 'Extra Colombo to Kandy trips are available during the holiday period.', audience: 'all', status: 'published', priority: 'normal', startDate: '2026-01-01', active: true, createdAt: '2026-01-01T00:00:00.000Z' }];
const demoTripMedia: Record<string, unknown>[] = [];
const demoTripMediaImages = new Map<string, { contentType: string; image: Buffer }>();
const demoMongoContent = () => ({
  demo: true,
  reviews: database.feedback,
  announcements: demoAnnouncements,
  documents: database.vehicles.slice(0, 3).map((vehicle) => ({ id: `document-${vehicle.id}`, title: `${vehicle.registrationNumber} · Insurance document`, detail: `${vehicle.make} ${vehicle.model} document record`, meta: `Expires ${vehicle.nextMaintenanceDate}` })),
  media: [...database.trips.slice(0, 3).map((trip) => ({ id: `media-${trip.id}`, title: `${trip.routeCode} trip media`, detail: `Photo/video reference for ${trip.origin} to ${trip.destination}`, meta: `${trip.vehicleReg ?? 'Vehicle'} · Demo media` })), ...demoTripMedia],
});
const enrichTripMedia = async (media: unknown[]) => {
  if (media.length === 0) return [];
  const [trips, routes, vehicles, drivers] = process.env.DATABASE_MODE === 'oracle'
    ? await Promise.all([oracleList('trips'), oracleList('routes'), oracleList('vehicles'), oracleList('drivers')])
      .catch((): [unknown[], unknown[], unknown[], unknown[]] => [[], [], [], []])
    : [database.trips, database.routes, database.vehicles, database.drivers];
  const findById = (items: unknown[], id: unknown) => items.find((item) => typeof item === 'object' && item !== null
    && 'id' in item && Number((item as { id: unknown }).id) === Number(id)) as Record<string, unknown> | undefined;
  return media.map((item) => {
    const record = item as Record<string, unknown>;
    const trip = findById(trips, record.tripId);
    const routeId = record.routeId ?? trip?.routeId;
    const route = findById(routes, routeId);
    const vehicle = findById(vehicles, record.vehicleId ?? trip?.vehicleId);
    const driver = findById(drivers, record.driverId ?? trip?.driverId);
    const routeCode = String(route?.routeCode ?? '');
    const origin = String(route?.origin ?? '');
    const destination = String(route?.destination ?? '');
    const tripName = routeCode && origin && destination ? `${routeCode} · ${origin} to ${destination}` : `Trip #${String(record.tripId ?? '—')}`;
    return {
      ...record,
      title: record.title ?? `${tripName} image`,
      description: record.description ?? record.caption ?? '',
      tripName,
      routeId: routeId ?? null,
      routeName: routeCode && origin && destination ? `${routeCode} · ${origin} to ${destination}` : 'Route unavailable',
      vehicleNumber: vehicle?.registrationNumber ?? 'Vehicle unavailable',
      driverName: driver ? `${String(driver.firstName ?? '')} ${String(driver.lastName ?? '')}`.trim() : `Driver #${String(record.driverId ?? '—')}`,
      status: record.status ?? 'approved',
      visibility: record.visibility ?? 'public',
      uploadedAt: record.createdAt ?? record.uploadedAt ?? null,
    };
  });
};
app.get('/api/health/oracle', async (_request, response) => response.json(await oracleHealth()));
app.get('/api/health/mongodb', async (_request, response) => response.json(await mongodbHealth()));
app.get('/api/health/databases', async (_request, response) => response.json({
  mode: process.env.DATABASE_MODE === 'oracle' ? 'oracle' : 'demo',
  oracle: await oracleHealth(),
  mongodb: await mongodbHealth(),
}));
app.get('/api/mongodb/content', async (_request, response) => {
  const health = await mongodbHealth();
  if (health.connected) {
    const content = await mongodbContent(_request.query.includeInactive === 'true');
    return response.json({ demo: false, ...content, media: await enrichTripMedia(content.media) });
  }
  if (process.env.DATABASE_MODE === 'demo') {
    const content = demoMongoContent();
    return response.json({ ...content, media: await enrichTripMedia(content.media) });
  }
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/reviews', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).reviews);
  if (process.env.DATABASE_MODE === 'demo') return response.json(database.feedback);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/feedback', async (_request, response) => {
  try {
    const health = await mongodbHealth();
    if (!health.connected) return response.status(503).json({ success: false, error: `${health.message}. Passenger feedback could not be loaded.` });
    const reviews = await mongodbPassengerReviews();
    return response.json(reviews.sort((a, b) => new Date(String(b.createdAt ?? '')).getTime() - new Date(String(a.createdAt ?? '')).getTime()));
  } catch (error) {
    console.error('MongoDB passenger feedback query failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return response.status(503).json({ success: false, error: 'MongoDB could not load passenger feedback.' });
  }
});
app.get('/api/mongodb/reviews/route/:routeId', async (request, response) => {
  const health = await mongodbHealth();
  if (!health.connected && process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
  const content = health.connected ? (await mongodbContent()).reviews : database.feedback;
  response.json(content.filter((review) => {
    const record = review as { routeId?: unknown; routeCode?: unknown };
    return String(record.routeId ?? record.routeCode) === request.params.routeId;
  }));
});
app.get('/api/mongodb/announcements', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).announcements);
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().announcements);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.post('/api/mongodb/announcements', async (request, response) => {
  const { title, message, audience, startDate, endDate, priority, status, routeId, tripId } = (request.body ?? {}) as Record<string, unknown>;
  const priorities = ['low', 'normal', 'high', 'urgent'];
  const statuses = ['draft', 'published', 'scheduled', 'expired'];
  const audiences = ['all', 'passengers', 'drivers'];
  if (typeof title !== 'string' || !title.trim()) return response.status(400).json({ error: 'title is required' });
  if (typeof message !== 'string' || !message.trim()) return response.status(400).json({ error: 'message is required' });
  if (typeof audience !== 'string' || !audiences.includes(audience)) return response.status(400).json({ error: 'audience must be all, passengers, or drivers' });
  if (typeof startDate !== 'string' || !startDate || Number.isNaN(Date.parse(startDate))) return response.status(400).json({ error: 'startDate must be a valid date' });
  if (endDate !== undefined && endDate !== '' && (typeof endDate !== 'string' || Number.isNaN(Date.parse(endDate)))) return response.status(400).json({ error: 'endDate must be a valid date' });
  if (endDate && Date.parse(endDate as string) < Date.parse(startDate)) return response.status(400).json({ error: 'endDate must be on or after startDate' });
  if (typeof priority !== 'string' || !priorities.includes(priority)) return response.status(400).json({ error: 'priority must be low, normal, high, or urgent' });
  if (typeof status !== 'string' || !statuses.includes(status)) return response.status(400).json({ error: 'status must be draft, published, scheduled, or expired' });

  const input: TravelAnnouncementInput = {
    title: title.trim(), message: message.trim(), audience: audience as TravelAnnouncementInput['audience'], startDate,
    ...(typeof endDate === 'string' && endDate ? { endDate } : {}),
    priority: priority as TravelAnnouncementInput['priority'],
    status: status as TravelAnnouncementInput['status'],
    ...(typeof routeId === 'string' && routeId ? { routeId } : {}),
    ...(typeof tripId === 'string' && tripId ? { tripId } : {}),
  };
  try {
    const health = await mongodbHealth();
    if (health.connected) return response.status(201).json(await mongodbCreateAnnouncement(input));
    if (process.env.DATABASE_MODE === 'demo') {
      const timestamp = new Date().toISOString();
      const announcement = { ...input, id: `announcement-${Date.now()}`, type: 'announcement', active: input.status === 'published', createdAt: timestamp, updatedAt: timestamp };
      demoAnnouncements.push(announcement);
      return response.status(201).json(announcement);
    }
    return response.status(503).json({ error: 'MongoDB is unavailable; announcements cannot be saved.' });
  } catch (error) {
    console.error('MongoDB announcement could not be saved:', error);
    return response.status(500).json({ error: 'Announcement could not be saved. Check MongoDB and try again.' });
  }
});
app.get('/api/mongodb/documents', async (_request, response) => {
  try {
    if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).documents);
    if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().documents);
    return response.status(503).json({ error: 'MongoDB is unavailable; vehicle documents could not be loaded.' });
  } catch (error) {
    console.error('MongoDB vehicle documents query failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return response.status(503).json({ error: 'MongoDB could not load vehicle documents.' });
  }
});
const parseVehicleDocument = (body: Record<string, unknown>): VehicleDocumentInput | string => {
  const vehicleId = Number(body.vehicleId);
  const registration = typeof body.registration === 'string' ? body.registration.trim() : '';
  const documentType = typeof body.documentType === 'string' ? body.documentType.trim() : '';
  const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : '';
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) return 'vehicleId must be a positive integer.';
  if (!registration || registration.length > 30) return 'registration is required and must be 30 characters or fewer.';
  if (!documentType || documentType.length > 60) return 'documentType is required and must be 60 characters or fewer.';
  if (!fileUrl || fileUrl.length > 2048) return 'fileUrl is required and must be 2048 characters or fewer.';
  let expiresOn: string | undefined;
  if (body.expiresOn !== undefined && body.expiresOn !== null && body.expiresOn !== '') {
    const expiry = typeof body.expiresOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expiresOn)
      ? new Date(`${body.expiresOn}T00:00:00.000Z`)
      : null;
    if (!expiry || Number.isNaN(expiry.getTime()) || expiry.toISOString().slice(0, 10) !== body.expiresOn) {
      return 'expiresOn must be a valid date in YYYY-MM-DD format.';
    }
    expiresOn = body.expiresOn;
  }
  return { vehicleId, registration, documentType, fileUrl, ...(expiresOn ? { expiresOn } : {}) };
};
app.post('/api/mongodb/documents', async (request, response) => {
  const input = parseVehicleDocument(request.body ?? {});
  if (typeof input === 'string') return response.status(400).json({ error: input });
  try {
    if (!(await mongodbHealth()).connected) return response.status(503).json({ error: 'MongoDB is unavailable; the vehicle document could not be saved.' });
    return response.status(201).json(await mongodbCreateVehicleDocument(input));
  } catch (error) {
    console.error('MongoDB vehicle document insert failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return response.status(500).json({ error: 'The vehicle document could not be saved.' });
  }
});
app.patch('/api/mongodb/documents/:id', async (request, response) => {
  const input = parseVehicleDocument(request.body ?? {});
  if (typeof input === 'string') return response.status(400).json({ error: input });
  try {
    if (!(await mongodbHealth()).connected) return response.status(503).json({ error: 'MongoDB is unavailable; the vehicle document could not be updated.' });
    const updated = await mongodbUpdateVehicleDocument(request.params.id, input);
    if (!updated) return response.status(404).json({ error: 'Vehicle document was not found.' });
    return response.json(updated);
  } catch (error) {
    console.error('MongoDB vehicle document update failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return response.status(500).json({ error: 'The vehicle document could not be updated.' });
  }
});
app.delete('/api/mongodb/documents/:id', async (request, response) => {
  try {
    if (!(await mongodbHealth()).connected) return response.status(503).json({ error: 'MongoDB is unavailable; the vehicle document could not be deleted.' });
    const deleted = await mongodbDeleteVehicleDocument(request.params.id);
    if (!deleted) return response.status(404).json({ error: 'Vehicle document was not found.' });
    return response.json({ success: true, id: request.params.id });
  } catch (error) {
    console.error('MongoDB vehicle document delete failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    return response.status(500).json({ error: 'The vehicle document could not be deleted.' });
  }
});
app.get('/api/mongodb/media', async (_request, response) => {
  if ((await mongodbHealth()).connected) return response.json((await mongodbContent()).media);
  if (process.env.DATABASE_MODE === 'demo') return response.json(demoMongoContent().media);
  return response.status(503).json({ error: 'MongoDB is unavailable; demo content is disabled outside demo mode.' });
});
app.get('/api/mongodb/media/:id/image', async (request, response) => {
  const health = await mongodbHealth();
  const image = health.connected
    ? await mongodbTripMediaImage(request.params.id)
    : process.env.DATABASE_MODE === 'demo' ? demoTripMediaImages.get(request.params.id) : null;
  if (!image) return response.status(404).json({ error: 'Trip media image was not found.' });
  response.set('Content-Type', image.contentType);
  response.set('Cache-Control', 'public, max-age=86400');
  return response.send(image.image);
});
app.patch('/api/mongodb/media/:id/status', async (request, response) => {
  const status = request.body.status;
  if (status !== 'approved' && status !== 'rejected') return response.status(400).json({ error: 'status must be approved or rejected.' });
  const health = await mongodbHealth();
  if (health.connected) {
    const updated = await mongodbUpdateTripMediaStatus(request.params.id, status as TripMediaStatus);
    if (!updated) return response.status(404).json({ error: 'Trip media was not found.' });
    return response.json(updated);
  }
  if (process.env.DATABASE_MODE !== 'demo') return response.status(503).json({ error: 'MongoDB is unavailable; trip media cannot be moderated.' });
  const record = demoTripMedia.find((item) => item.id === request.params.id);
  if (!record) return response.status(404).json({ error: 'Trip media was not found.' });
  record.status = status;
  record.visibility = status === 'approved' ? 'public' : 'hidden';
  record.reviewedAt = new Date().toISOString();
  return response.json(record);
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

const passengerErrorResponse = (error: unknown, response: Response) => {
  const failure = error as Error & { statusCode?: number; errorNum?: number; code?: string };
  const oracleCode = failure.code?.match(/ORA-(\d{5})/)?.[1] ?? String(failure.errorNum ?? '');
  if (/^20\d{3}$/.test(oracleCode)) {
    const message = failure.message.split(/\r?\n/, 1)[0].replace(/^ORA-20\d{3}:\s*/, '');
    return response.status(400).json({ error: message });
  }
  if (oracleCode === '00001') return response.status(409).json({ error: 'A conflicting passenger or booking record already exists.' });
  if (failure.statusCode && failure.statusCode >= 400 && failure.statusCode < 500) {
    return response.status(failure.statusCode).json({ error: failure.message });
  }
  console.error(`Passenger API request failed${oracleCode ? ` with ORA-${oracleCode}` : failure.code ? ` with ${failure.code}` : ''}.`);
  return response.status(500).json({ error: 'Passenger request could not be completed. Please try again.' });
};

const requireActingPassenger = async (request: Request, response: Response, next: NextFunction) => {
  const header = request.get('X-Passenger-Id');
  if (!header) return response.status(400).json({ error: 'X-Passenger-Id header is required.' });
  const passengerId = Number(header);
  if (!Number.isInteger(passengerId) || passengerId <= 0) return response.status(400).json({ error: 'X-Passenger-Id must be a positive integer.' });
  try {
    const exists = process.env.DATABASE_MODE === 'oracle'
      ? await oraclePassengerExists(passengerId)
      : process.env.DATABASE_MODE === 'demo'
        ? database.passengers.some((passenger) => passenger.id === passengerId)
        : null;
    if (exists === null) return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using passenger endpoints.' });
    if (!exists) return response.status(404).json({ error: 'Passenger was not found.' });
    response.locals.passengerId = passengerId;
    return next();
  } catch (error) {
    return passengerErrorResponse(error, response);
  }
};

type PassengerHandler = (request: Request, response: Response, passengerId: number) => Promise<void> | void;
const passengerEndpoint = (handler: PassengerHandler) => async (request: Request, response: Response) => {
  try {
    await handler(request, response, Number(response.locals.passengerId));
  } catch (error) {
    return passengerErrorResponse(error, response);
  }
};

const passengerProfile = (passenger: Passenger) => ({
  passengerId: passenger.id, firstName: passenger.firstName, lastName: passenger.lastName,
  phone: passenger.phone, address: passenger.address, email: passenger.email, passportOrNic: passenger.passportOrNic,
});

app.get('/api/passenger/trips', requireActingPassenger, passengerEndpoint(async (request, response) => {
  const filters = { origin: request.query.origin, destination: request.query.destination, date: request.query.date };
  if (process.env.DATABASE_MODE === 'oracle') return void response.json(await oraclePassengerSearchTrips(filters));
  const requestedDate = typeof filters.date === 'string' ? filters.date : '';
  if (requestedDate && (Number.isNaN(Date.parse(requestedDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate))) {
    return void response.status(400).json({ error: 'date must use YYYY-MM-DD format.' });
  }
  const origin = String(filters.origin ?? '').trim().toLowerCase();
  const destination = String(filters.destination ?? '').trim().toLowerCase();
  const now = Date.now();
  return void response.json(database.trips.filter((trip) => {
    const route = database.routes.find((item) => item.id === trip.routeId);
    const departure = new Date(trip.departureTime);
    return trip.status === 'scheduled' && departure.getTime() > now && trip.availableSeats > 0
      && (!origin || route?.origin.toLowerCase().includes(origin))
      && (!destination || route?.destination.toLowerCase().includes(destination))
      && (!requestedDate || departure.toISOString().slice(0, 10) === requestedDate);
  }).map((trip) => {
    const route = database.routes.find((item) => item.id === trip.routeId);
    return { tripId: trip.id, routeId: trip.routeId, routeCode: route?.routeCode, origin: route?.origin,
      destination: route?.destination, departureTime: trip.departureTime, arrivalTime: trip.arrivalTime,
      availableSeats: trip.availableSeats, totalSeats: trip.totalSeats, fareAmount: route?.fareAmount };
  }));
}));

app.post('/api/passenger/bookings', requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  const tripId = Number(request.body.tripId);
  if (request.body.seatCount !== undefined) {
    const seatCount = Number(request.body.seatCount);
    const amount = Number(request.body.amount);
    const pickupPoint = String(request.body.pickupPoint ?? '').trim();
    const dropoffPoint = String(request.body.dropoffPoint ?? '').trim();
    if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(seatCount) || seatCount < 1
      || !Number.isFinite(amount) || !pickupPoint || !dropoffPoint) {
      return void response.status(400).json({ error: 'tripId, a positive seatCount, pickupPoint, dropoffPoint, and total amount are required.' });
    }
    if (process.env.DATABASE_MODE === 'oracle') {
      const result = await oraclePassengerBookSeats(passengerId, tripId, seatCount, amount, pickupPoint, dropoffPoint);
      return void response.status(201).json({ ...result, tripId, status: 'pending' });
    }
    const trip = database.trips.find((item) => item.id === tripId);
    if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
    if (trip.status !== 'scheduled') return void response.status(400).json({ error: 'Only scheduled trips can be booked.' });
    if (new Date(trip.departureTime).getTime() <= Date.now()) return void response.status(400).json({ error: 'Trip has already departed or is not in the future.' });
    if (seatCount > trip.availableSeats) return void response.status(400).json({ error: `Only ${trip.availableSeats} seats are available for this trip.` });
    if (database.bookings.some((booking) => booking.tripId === tripId && booking.passengerId === passengerId && ['pending', 'confirmed'].includes(booking.status))) {
      return void response.status(400).json({ error: 'Passenger already has an active booking on this trip.' });
    }
    const route = database.routes.find((item) => item.id === trip.routeId);
    if (!route) return void response.status(400).json({ error: 'Trip route was not found.' });
    const segmentFare = calculateSegmentFare(route, pickupPoint, dropoffPoint);
    if (segmentFare === null) return void response.status(400).json({ error: 'Pickup point must come before the drop-off point on this route.' });
    const totalAmount = calculateTotalFare(segmentFare, seatCount);
    if (totalAmount === null) return void response.status(400).json({ error: 'The fare and seat count could not be calculated.' });
    if (Math.round(amount * 100) !== Math.round(totalAmount * 100)) return void response.status(400).json({ error: 'Booking amount must equal the selected route segment fare multiplied by the seat count.' });
    const occupiedSeats = new Set(database.bookings
      .filter((booking) => booking.tripId === tripId && ['pending', 'confirmed'].includes(booking.status))
      .map((booking) => Number(booking.seatNumber.match(/[0-9]+/)?.[0]))
      .filter(Number.isFinite));
    const seatNumbers = Array.from({ length: trip.totalSeats }, (_, index) => index + 1)
      .filter((seat) => !occupiedSeats.has(seat))
      .slice(0, seatCount);
    if (seatNumbers.length !== seatCount) return void response.status(400).json({ error: 'There are not enough unbooked seats for this request.' });
    const bookingDate = new Date().toISOString();
    const createdBookings: Booking[] = [];
    for (const seat of seatNumbers) {
      createdBookings.push({
        id: nextId([...database.bookings, ...createdBookings]), tripId, passengerId,
        seatNumber: String(seat), bookingDate, status: 'pending', amount: segmentFare,
      });
    }
    database.bookings.push(...createdBookings);
    trip.availableSeats -= seatCount;
    return void response.status(201).json({
      bookingId: createdBookings[0].id,
      bookingIds: createdBookings.map((booking) => booking.id),
      seatNumbers: createdBookings.map((booking) => booking.seatNumber),
      seatCount,
      segmentFare,
      tripId,
      status: 'pending',
      amount: totalAmount,
    });
  }
  const seatNumber = String(request.body.seatNumber ?? '').trim();
  if (!Number.isInteger(tripId) || tripId <= 0 || !seatNumber) return void response.status(400).json({ error: 'tripId and seatNumber are required.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    const bookingId = await oraclePassengerBookSeat(passengerId, tripId, seatNumber);
    return void response.status(201).json({ bookingId, tripId, status: 'pending' });
  }
  const trip = database.trips.find((item) => item.id === tripId);
  if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
  if (trip.status !== 'scheduled') return void response.status(400).json({ error: 'Only scheduled trips can be booked.' });
  if (new Date(trip.departureTime).getTime() <= Date.now()) return void response.status(400).json({ error: 'Trip has already departed or is not in the future.' });
  if (!/^\d+$/.test(seatNumber)) return void response.status(400).json({ error: 'Seat number must be a whole number.' });
  const seat = Number(seatNumber);
  if (seat < 1 || seat > trip.totalSeats) return void response.status(400).json({ error: 'Seat number must be between 1 and trip capacity.' });
  if (database.bookings.some((booking) => booking.tripId === tripId && Number(booking.seatNumber.match(/[0-9]+/)?.[0]) === seat && ['pending', 'confirmed'].includes(booking.status))) {
    return void response.status(400).json({ error: 'That seat is already booked on this trip.' });
  }
  if (trip.availableSeats <= 0) return void response.status(400).json({ error: 'Trip is full.' });
  if (database.bookings.some((booking) => booking.tripId === tripId && booking.passengerId === passengerId && ['pending', 'confirmed'].includes(booking.status))) {
    return void response.status(400).json({ error: 'Passenger already has an active booking on this trip.' });
  }
  const route = database.routes.find((item) => item.id === trip.routeId);
  if (!route) return void response.status(400).json({ error: 'Trip route was not found.' });
  const booking: Booking = { id: nextId(database.bookings), tripId, passengerId, seatNumber: String(seat), bookingDate: new Date().toISOString(), status: 'pending', amount: route.fareAmount };
  database.bookings.push(booking);
  trip.availableSeats -= 1;
  return void response.status(201).json({ bookingId: booking.id, tripId, status: booking.status, amount: booking.amount });
}));

app.post('/api/passenger/payments', requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  if (Array.isArray(request.body.bookingIds)) {
    const bookingIds: number[] = (request.body.bookingIds as unknown[]).map(Number);
    const amount = Number(request.body.amount);
    const method = String(request.body.method ?? '').toLowerCase();
    if (!bookingIds.length || bookingIds.some((id) => !Number.isInteger(id) || id <= 0) || new Set(bookingIds).size !== bookingIds.length
      || !Number.isFinite(amount) || !method) {
      return void response.status(400).json({ error: 'Unique bookingIds, total amount, and method are required.' });
    }
    if (!['card', 'cash', 'online', 'bank_transfer'].includes(method)) return void response.status(400).json({ error: 'Payment method is not valid.' });
    if (process.env.DATABASE_MODE === 'oracle') {
      await oraclePassengerPayBookings(passengerId, bookingIds, amount, method);
      return void response.json({ bookingIds, amount, paymentStatus: 'paid', bookingStatus: 'confirmed' });
    }
    const selectedBookings = bookingIds.map((id) => database.bookings.find((booking) => booking.id === id));
    if (selectedBookings.some((booking) => !booking)) return void response.status(404).json({ error: 'A booking was not found.' });
    const payableBookings = selectedBookings as Booking[];
    if (payableBookings.some((booking) => booking.passengerId !== passengerId)) return void response.status(400).json({ error: 'Booking does not belong to this passenger.' });
    if (payableBookings.some((booking) => booking.status !== 'pending')) return void response.status(400).json({ error: 'Only pending bookings can be paid.' });
    if (payableBookings.some((booking) => database.payments.some((payment) => payment.bookingId === booking.id && payment.status === 'paid'))) {
      return void response.status(400).json({ error: 'A booking has already been paid.' });
    }
    const totalAmount = Math.round(payableBookings.reduce((total, booking) => total + booking.amount, 0) * 100) / 100;
    if (Math.round(amount * 100) !== Math.round(totalAmount * 100)) return void response.status(400).json({ error: 'Payment amount must equal the total booking amount.' });
    const paymentDate = new Date().toISOString();
    const createdPayments: Payment[] = [];
    for (const booking of payableBookings) {
      createdPayments.push({
        id: nextId([...database.payments, ...createdPayments]), bookingId: booking.id,
        amount: booking.amount, paymentDate, method: method as PaymentMethod,
        status: 'paid', transactionRef: `DEMO-${Date.now()}-${booking.id}`,
      });
    }
    database.payments.push(...createdPayments);
    payableBookings.forEach((booking) => { booking.status = 'confirmed'; });
    const passenger = database.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.totalBookings += payableBookings.length;
    return void response.json({ bookingIds, amount: totalAmount, paymentStatus: 'paid', bookingStatus: 'confirmed' });
  }
  const bookingId = Number(request.body.bookingId);
  const amount = Number(request.body.amount);
  const method = String(request.body.method ?? '').toLowerCase();
  if (!Number.isInteger(bookingId) || bookingId <= 0 || !Number.isFinite(amount) || !method) {
    return void response.status(400).json({ error: 'bookingId, amount, and method are required.' });
  }
  if (process.env.DATABASE_MODE === 'oracle') {
    await oraclePassengerPayBooking(passengerId, bookingId, amount, method);
    return void response.json({ bookingId, paymentStatus: 'paid', bookingStatus: 'confirmed' });
  }
  const booking = database.bookings.find((item) => item.id === bookingId);
  if (!booking) return void response.status(404).json({ error: 'Booking was not found.' });
  if (booking.passengerId !== passengerId) return void response.status(400).json({ error: 'Booking does not belong to this passenger.' });
  if (database.payments.some((payment) => payment.bookingId === bookingId && payment.status === 'paid')) return void response.status(400).json({ error: 'Booking has already been paid.' });
  if (booking.status !== 'pending') return void response.status(400).json({ error: 'Only pending bookings can be paid.' });
  if (amount !== booking.amount) return void response.status(400).json({ error: 'Payment amount must equal the booking amount.' });
  if (!['card', 'cash', 'online', 'bank_transfer'].includes(method)) return void response.status(400).json({ error: 'Payment method is not valid.' });
  const payment: Payment = { id: nextId(database.payments), bookingId, amount: booking.amount, paymentDate: new Date().toISOString(), method: method as PaymentMethod, status: 'paid', transactionRef: `DEMO-${Date.now()}` };
  database.payments.push(payment);
  booking.status = 'confirmed';
  const passenger = database.passengers.find((item) => item.id === passengerId);
  if (passenger) passenger.totalBookings += 1;
  return void response.json({ bookingId, paymentStatus: 'paid', bookingStatus: 'confirmed' });
}));

app.post('/api/passenger/bookings/:id/cancel', requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  const bookingId = Number(request.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) return void response.status(400).json({ error: 'bookingId must be a positive integer.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    await oraclePassengerCancelBooking(passengerId, bookingId);
    return void response.json({ bookingId, bookingStatus: 'cancelled' });
  }
  const booking = database.bookings.find((item) => item.id === bookingId);
  if (!booking) return void response.status(404).json({ error: 'Booking was not found.' });
  if (booking.passengerId !== passengerId) return void response.status(400).json({ error: 'Booking does not belong to this passenger.' });
  if (!['pending', 'confirmed'].includes(booking.status)) return void response.status(400).json({ error: 'Only pending or confirmed bookings can be cancelled.' });
  const wasConfirmed = booking.status === 'confirmed';
  const trip = database.trips.find((item) => item.id === booking.tripId);
  if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
  if (new Date(trip.departureTime).getTime() <= Date.now() + 2 * 60 * 60 * 1000) return void response.status(400).json({ error: 'Bookings cannot be cancelled within two hours of departure.' });
  booking.status = 'cancelled';
  trip.availableSeats = Math.min(trip.totalSeats, trip.availableSeats + 1);
  if (database.payments.some((payment) => payment.bookingId === bookingId && payment.status === 'paid')) {
    database.payments.filter((payment) => payment.bookingId === bookingId && payment.status === 'paid').forEach((payment) => { payment.status = 'refunded'; });
  }
  if (wasConfirmed) {
    const passenger = database.passengers.find((item) => item.id === passengerId);
    if (passenger) passenger.totalBookings = Math.max(0, passenger.totalBookings - 1);
  }
  return void response.json({ bookingId, bookingStatus: 'cancelled' });
}));

app.get('/api/passenger/bookings', requireActingPassenger, passengerEndpoint(async (_request, response, passengerId) => {
  if (process.env.DATABASE_MODE === 'oracle') return void response.json(await oraclePassengerBookings(passengerId));
  const now = Date.now();
  const bookings = database.bookings.filter((booking) => booking.passengerId === passengerId).map((booking) => {
    const trip = database.trips.find((item) => item.id === booking.tripId);
    const route = database.routes.find((item) => item.id === trip?.routeId);
    const lastPayment = database.payments.filter((payment) => payment.bookingId === booking.id).at(-1);
    return { bookingId: booking.id, tripId: booking.tripId, seatNumber: booking.seatNumber, bookingDate: booking.bookingDate,
      bookingStatus: booking.status, amount: booking.amount, tripStatus: trip?.status, departureTime: trip?.departureTime,
      arrivalTime: trip?.arrivalTime, availableSeats: trip?.availableSeats, routeId: route?.id, routeCode: route?.routeCode,
      vehicleId: trip?.vehicleId, driverId: trip?.driverId, origin: route?.origin, destination: route?.destination, paymentStatus: lastPayment?.status ?? 'unpaid',
      canCancel: Boolean(trip && ['pending', 'confirmed'].includes(booking.status) && new Date(trip.departureTime).getTime() > now + 2 * 60 * 60 * 1000) };
  });
  return void response.json(bookings);
}));

app.post('/api/passenger/feedback', requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  const tripId = Number(request.body.tripId);
  const rating = Number(request.body.rating);
  const comment = String(request.body.comment ?? '').trim();
  const category = String(request.body.category ?? 'general').toLowerCase();
  if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(rating) || !comment) {
    return void response.status(400).json({ error: 'tripId, a 1-5 rating, and comment are required.' });
  }
  if (process.env.DATABASE_MODE === 'oracle') {
    await oraclePassengerSubmitFeedback(passengerId, tripId, rating, comment, category);
    return void response.status(201).json({ tripId, rating, category });
  }
  if (rating < 1 || rating > 5) return void response.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
  const trip = database.trips.find((item) => item.id === tripId);
  if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
  if (trip.status !== 'completed') return void response.status(400).json({ error: 'Feedback is allowed only for completed trips.' });
  if (!database.bookings.some((booking) => booking.passengerId === passengerId && booking.tripId === tripId && booking.status !== 'cancelled')) return void response.status(400).json({ error: 'Passenger must have a non-cancelled booking for this trip.' });
  if (database.feedback.some((item) => item.passengerId === passengerId && item.tripId === tripId)) return void response.status(400).json({ error: 'Passenger has already submitted feedback for this trip.' });
  if (!['service', 'driver', 'vehicle', 'punctuality', 'general'].includes(category)) return void response.status(400).json({ error: 'Feedback category is not valid.' });
  const feedback: Feedback = { id: nextId(database.feedback), passengerId, tripId, driverId: trip.driverId, vehicleId: trip.vehicleId, rating, comment, feedbackDate: new Date().toISOString(), category: category as Feedback['category'] };
  database.feedback.push(feedback);
  return void response.status(201).json({ tripId, rating, category });
}));

const requirePassengerFeedbackRole = (request: Request, response: Response, next: NextFunction) => {
  const role = request.get('X-Role')?.toLowerCase();
  if (role !== 'passenger' || request.get('X-Driver-Id')) {
    return response.status(403).json({ error: 'Only passengers can submit passenger feedback.' });
  }
  return next();
};

app.post('/api/mongodb/feedback', requirePassengerFeedbackRole, requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  const body = request.body as Record<string, unknown>;
  const type = body.type;
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  const rating = body.rating === undefined ? undefined : Number(body.rating);
  const category = typeof body.category === 'string' ? body.category.toLowerCase() : undefined;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const readId = (field: string): number | undefined => {
    const value = body[field];
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw Object.assign(new Error(`${field} must be a positive integer.`), { statusCode: 400 });
    return parsed;
  };
  let routeId: number | undefined;
  let tripId: number | undefined;
  let vehicleId: number | undefined;
  let driverId: number | undefined;
  try {
    routeId = readId('routeId');
    tripId = readId('tripId');
    vehicleId = readId('vehicleId');
    driverId = readId('driverId');
  } catch (error) {
    return void response.status(400).json({ error: (error as Error).message });
  }
  if (type !== 'review' && type !== 'complaint') return void response.status(400).json({ error: 'type must be review or complaint.' });
  if (!comment) return void response.status(400).json({ error: 'comment is required.' });
  if (body.rating !== undefined && (!Number.isInteger(rating) || rating! < 1 || rating! > 5)) {
    return void response.status(400).json({ error: 'rating must be a whole number from 1 to 5.' });
  }
  if (body.title !== undefined && typeof body.title !== 'string') return void response.status(400).json({ error: 'title must be a string.' });
  if (category && !['service', 'driver', 'vehicle', 'punctuality', 'general'].includes(category)) {
    return void response.status(400).json({ error: 'Feedback category is not valid.' });
  }

  const passenger = process.env.DATABASE_MODE === 'oracle'
    ? await oraclePassengerProfile(passengerId)
    : database.passengers.find((item) => item.id === passengerId);
  if (!passenger) return void response.status(404).json({ error: 'Passenger was not found.' });
  const passengerName = `${passenger.firstName} ${passenger.lastName}`;

  let trip: Record<string, unknown> | undefined;
  if (tripId !== undefined) {
    if (process.env.DATABASE_MODE === 'oracle') {
      const [trips, bookings] = await Promise.all([oracleList('trips'), oraclePassengerBookings(passengerId)]);
      trip = trips.find((item) => Number(item.id) === tripId);
      const booking = bookings.find((item) => Number(item.tripId) === tripId && item.bookingStatus !== 'cancelled');
      if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
      if (String(booking?.tripStatus).toLowerCase() !== 'completed') return void response.status(400).json({ error: 'Feedback is allowed only for completed trips booked by this passenger.' });
    } else {
      const foundTrip = database.trips.find((item) => item.id === tripId);
      if (!foundTrip) return void response.status(404).json({ error: 'Trip was not found.' });
      trip = foundTrip as unknown as Record<string, unknown>;
      if (foundTrip.status !== 'completed') return void response.status(400).json({ error: 'Feedback is allowed only for completed trips.' });
      if (!database.bookings.some((booking) => booking.passengerId === passengerId && booking.tripId === tripId && booking.status !== 'cancelled')) {
        return void response.status(400).json({ error: 'Passenger must have a non-cancelled booking for this trip.' });
      }
      if (database.feedback.some((item) => item.passengerId === passengerId && item.tripId === tripId)) {
        return void response.status(400).json({ error: 'Passenger has already submitted feedback for this trip.' });
      }
    }
    const relatedIds = { routeId: Number(trip.routeId), vehicleId: Number(trip.vehicleId), driverId: Number(trip.driverId) };
    if ((routeId !== undefined && routeId !== relatedIds.routeId)
      || (vehicleId !== undefined && vehicleId !== relatedIds.vehicleId)
      || (driverId !== undefined && driverId !== relatedIds.driverId)) {
      return void response.status(400).json({ error: 'Feedback IDs must match the selected trip.' });
    }
    routeId ??= relatedIds.routeId;
    vehicleId ??= relatedIds.vehicleId;
    driverId ??= relatedIds.driverId;
  }

  const mongo = await mongodbHealth();
  const input: PassengerReviewInput = {
    type,
    passengerId,
    passengerName,
    ...(tripId === undefined ? {} : { tripId }),
    ...(routeId === undefined ? {} : { routeId }),
    ...(vehicleId === undefined ? {} : { vehicleId }),
    ...(driverId === undefined ? {} : { driverId }),
    ...(rating === undefined ? {} : { rating }),
    ...(title ? { title } : {}),
    comment,
    ...(category ? { category } : {}),
  };

  if (mongo.connected) {
    try {
      const data = await mongodbCreatePassengerReview(input);
      if (typeof data._id !== 'string' || !data._id) throw new Error('MongoDB did not return an inserted ID.');
      console.info('MongoDB passenger feedback inserted', { collection: 'passenger_feedback', passengerId, insertedId: data._id });
      return void response.status(201).json({ success: true, data });
    } catch (error) {
      console.error('MongoDB passenger feedback insert failed', { collection: 'passenger_feedback', errorName: error instanceof Error ? error.name : 'UnknownError' });
      return void response.status(500).json({ success: false, error: 'MongoDB insertion failed. The review could not be saved.' });
    }
  }
  const mongoFailure = mongo.message.toLowerCase().includes('not configured')
    ? 'MongoDB is not configured.'
    : 'MongoDB is not connected.';
  return void response.status(503).json({ success: false, error: `${mongoFailure} The review could not be saved.` });
}));

app.get('/api/passenger/profile', requireActingPassenger, passengerEndpoint(async (_request, response, passengerId) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    const profile = await oraclePassengerProfile(passengerId);
    if (!profile) return void response.status(404).json({ error: 'Passenger was not found.' });
    return void response.json(profile);
  }
  const passenger = database.passengers.find((item) => item.id === passengerId);
  return void response.json(passengerProfile(passenger!));
}));

app.put('/api/passenger/profile', requireActingPassenger, passengerEndpoint(async (request, response, passengerId) => {
  const firstName = String(request.body.firstName ?? '').trim();
  const lastName = String(request.body.lastName ?? '').trim();
  const phone = request.body.phone === null ? null : String(request.body.phone ?? '').trim() || null;
  const address = request.body.address === null ? null : String(request.body.address ?? '').trim() || null;
  if (!firstName || !lastName) return void response.status(400).json({ error: 'First name and last name are required.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    await oraclePassengerUpdateProfile(passengerId, { firstName, lastName, phone, address });
    const profile = await oraclePassengerProfile(passengerId);
    return void response.json(profile);
  }
  const passenger = database.passengers.find((item) => item.id === passengerId);
  if (!passenger) return void response.status(404).json({ error: 'Passenger was not found.' });
  Object.assign(passenger, { firstName, lastName, phone, address });
  return void response.json(passengerProfile(passenger));
}));

const driverErrorResponse = (error: unknown, response: Response) => {
  const failure = error as Error & { statusCode?: number; errorNum?: number; code?: string };
  const oracleCode = failure.code?.match(/ORA-(\d{5})/)?.[1] ?? String(failure.errorNum ?? '');
  if (/^20\d{3}$/.test(oracleCode)) {
    return response.status(400).json({ error: failure.message.split(/\r?\n/, 1)[0].replace(/^ORA-20\d{3}:\s*/, '') });
  }
  if (oracleCode === '00001') return response.status(409).json({ error: 'Driver email already belongs to another driver.' });
  if (failure.statusCode && failure.statusCode >= 400 && failure.statusCode < 500) {
    return response.status(failure.statusCode).json({ error: failure.message });
  }
  console.error(`Driver API request failed${oracleCode ? ` with ORA-${oracleCode}` : failure.code ? ` with ${failure.code}` : ''}.`);
  return response.status(500).json({ error: 'Driver request could not be completed. Please try again.' });
};

const requireActingDriver = async (request: Request, response: Response, next: NextFunction) => {
  const header = request.get('X-Driver-Id');
  if (!header) return response.status(400).json({ error: 'X-Driver-Id header is required.' });
  const driverId = Number(header);
  if (!Number.isInteger(driverId) || driverId <= 0) return response.status(400).json({ error: 'X-Driver-Id must be a positive integer.' });
  try {
    const exists = process.env.DATABASE_MODE === 'oracle'
      ? await oracleDriverExists(driverId)
      : process.env.DATABASE_MODE === 'demo'
        ? database.drivers.some((driver) => driver.id === driverId)
        : null;
    if (exists === null) return response.status(503).json({ error: 'Set DATABASE_MODE to oracle or demo before using driver endpoints.' });
    if (!exists) return response.status(404).json({ error: 'Driver was not found.' });
    response.locals.driverId = driverId;
    return next();
  } catch (error) { return driverErrorResponse(error, response); }
};

type DriverHandler = (request: Request, response: Response, driverId: number) => Promise<void> | void;
const driverEndpoint = (handler: DriverHandler) => async (request: Request, response: Response) => {
  try { await handler(request, response, Number(response.locals.driverId)); }
  catch (error) { return driverErrorResponse(error, response); }
};

const driverProfile = (driver: Driver) => ({
  driverId: driver.id, firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone,
  email: driver.email, licenseNumber: driver.licenseNumber, licenseExpiry: driver.licenseExpiry,
  status: driver.status, rating: driver.rating, totalTrips: driver.totalTrips,
});

const validImage = (image: Buffer, contentType: string) => {
  if (contentType === 'image/jpeg') return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (contentType === 'image/png') return image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === 'image/webp') return image.length >= 12 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP';
  return false;
};

app.post('/api/driver/trips/:tripId/media', requireActingDriver, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '8mb' }), driverEndpoint(async (request, response, driverId) => {
  const tripId = Number(request.params.tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) return void response.status(400).json({ error: 'tripId must be a positive integer.' });
  const contentType = request.get('Content-Type')?.split(';', 1)[0].toLowerCase() ?? '';
  const image = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
  if (!validImage(image, contentType)) return void response.status(400).json({ error: 'Upload a valid JPEG, PNG, or WebP image.' });
  const caption = String(request.query.caption ?? '').trim();
  if (caption.length > 300) return void response.status(400).json({ error: 'Caption must be 300 characters or fewer.' });

  let routeId: number | undefined;
  if (process.env.DATABASE_MODE === 'oracle') {
    const manifest = await oracleDriverManifest(driverId, tripId);
    if (manifest === null) return void response.status(404).json({ error: 'Trip was not found for this driver.' });
  } else {
    const trip = database.trips.find((item) => item.id === tripId && item.driverId === driverId);
    if (!trip) return void response.status(404).json({ error: 'Trip was not found for this driver.' });
    routeId = trip.routeId;
  }

  const mongo = await mongodbHealth();
  if (!mongo.connected && process.env.DATABASE_MODE !== 'demo') {
    return void response.status(503).json({ error: 'MongoDB is unavailable; trip media cannot be saved.' });
  }
  const input = { tripId, driverId, ...(routeId === undefined ? {} : { routeId }), caption, contentType, image };
  if (mongo.connected) return void response.status(201).json(await mongodbCreateTripMedia(input));

  const id = randomUUID();
  const url = `/api/mongodb/media/${id}/image`;
  demoTripMediaImages.set(id, { contentType, image });
  const media = { id, tripId, driverId, ...(routeId === undefined ? {} : { routeId }), mediaType: 'photo', caption, uploadedBy: `driver:${driverId}`, createdAt: new Date().toISOString(), status: 'pending', visibility: 'hidden', url };
  demoTripMedia.push(media);
  return void response.status(201).json(media);
}));

const demoDriverSummary = (driverId: number) => {
  const driver = database.drivers.find((item) => item.id === driverId)!;
  const driverTrips = database.trips.filter((trip) => trip.driverId === driverId);
  const ratings = database.feedback.filter((item) => item.driverId === driverId);
  const averageRating = ratings.length ? ratings.reduce((total, item) => total + Number(item.rating), 0) / ratings.length : null;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  return {
    driverId, firstName: driver.firstName, lastName: driver.lastName, status: driver.status,
    licenseExpiry: driver.licenseExpiry, todayTrips: driverTrips.filter((trip) => {
      const departure = new Date(trip.departureTime).getTime();
      return departure >= todayStart && departure < tomorrowStart;
    }).length,
    upcomingTrips: driverTrips.filter((trip) => trip.status === 'scheduled' && new Date(trip.departureTime).getTime() > Date.now()).length,
    completedTrips: driverTrips.filter((trip) => trip.status === 'completed').length,
    averageRating, ratingCount: ratings.length,
  };
};

app.get('/api/driver/summary', requireActingDriver, driverEndpoint(async (_request, response, driverId) => {
  const summary = process.env.DATABASE_MODE === 'oracle' ? await oracleDriverSummary(driverId) : demoDriverSummary(driverId);
  if (!summary) return void response.status(404).json({ error: 'Driver was not found.' });
  return void response.json(summary);
}));

app.get('/api/driver/trips', requireActingDriver, driverEndpoint(async (request, response, driverId) => {
  const filter = String(request.query.filter ?? 'upcoming');
  if (!['upcoming', 'in_progress', 'completed'].includes(filter)) return void response.status(400).json({ error: 'filter must be upcoming, in_progress, or completed.' });
  if (process.env.DATABASE_MODE === 'oracle') return void response.json(await oracleDriverTrips(driverId, filter as 'upcoming' | 'in_progress' | 'completed'));
  const activeTripExists = database.trips.some((trip) => trip.driverId === driverId && trip.status === 'in_progress');
  return void response.json(database.trips.filter((trip) => {
    if (trip.driverId !== driverId) return false;
    if (filter === 'upcoming') return trip.status === 'scheduled' && new Date(trip.departureTime).getTime() > Date.now();
    return trip.status === filter;
  }).map((trip) => {
    const route = database.routes.find((item) => item.id === trip.routeId);
    const vehicle = database.vehicles.find((item) => item.id === trip.vehicleId);
    return { tripId: trip.id, routeId: trip.routeId, routeCode: route?.routeCode, origin: route?.origin,
      destination: route?.destination, departureTime: trip.departureTime, arrivalTime: trip.arrivalTime,
      status: trip.status, availableSeats: trip.availableSeats, totalSeats: trip.totalSeats,
      vehicleId: trip.vehicleId, vehicleRegistration: vehicle?.registrationNumber,
      seatsBooked: trip.totalSeats - trip.availableSeats,
      canStart: trip.status === 'scheduled' && new Date(trip.departureTime).getTime() <= Date.now() + 30 * 60 * 1000 && !activeTripExists,
      canComplete: trip.status === 'in_progress' };
  }));
}));

app.get('/api/driver/trips/:tripId/manifest', requireActingDriver, driverEndpoint(async (request, response, driverId) => {
  const tripId = Number(request.params.tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) return void response.status(400).json({ error: 'tripId must be a positive integer.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    const manifest = await oracleDriverManifest(driverId, tripId);
    if (!manifest) return void response.status(404).json({ error: 'Trip was not found for this driver.' });
    return void response.json(manifest);
  }
  const trip = database.trips.find((item) => item.id === tripId && item.driverId === driverId);
  if (!trip) return void response.status(404).json({ error: 'Trip was not found for this driver.' });
  const manifest = database.bookings.filter((booking) => booking.tripId === tripId).map((booking) => {
    const passenger = database.passengers.find((item) => item.id === booking.passengerId);
    const payment = database.payments.filter((item) => item.bookingId === booking.id).at(-1);
    return { bookingId: booking.id, passengerId: booking.passengerId,
      passengerName: passenger ? `${passenger.firstName} ${passenger.lastName}` : 'Passenger unavailable',
      phone: passenger?.phone ?? null, seatNumber: booking.seatNumber, bookingStatus: booking.status,
      paymentStatus: payment?.status ?? 'unpaid' };
  });
  return void response.json(manifest);
}));

app.post('/api/driver/trips/:tripId/start', requireActingDriver, driverEndpoint(async (request, response, driverId) => {
  const tripId = Number(request.params.tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) return void response.status(400).json({ error: 'tripId must be a positive integer.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    await oracleDriverStartTrip(driverId, tripId);
  } else {
    const trip = database.trips.find((item) => item.id === tripId);
    if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
    if (trip.driverId !== driverId) return void response.status(400).json({ error: 'Trip is not assigned to this driver.' });
    if (trip.status !== 'scheduled') return void response.status(400).json({ error: 'Only scheduled trips can be started.' });
    if (new Date(trip.departureTime).getTime() > Date.now() + 30 * 60 * 1000) return void response.status(400).json({ error: 'Trip can only be started within 30 minutes of departure.' });
    if (database.trips.some((item) => item.driverId === driverId && item.id !== tripId && item.status === 'in_progress')) return void response.status(400).json({ error: 'Driver already has another in-progress trip.' });
    trip.status = 'in_progress';
    const driver = database.drivers.find((item) => item.id === driverId);
    if (driver) driver.status = 'on_trip';
  }
  return void response.json({ tripId, status: 'in_progress' });
}));

app.post('/api/driver/trips/:tripId/complete', requireActingDriver, driverEndpoint(async (request, response, driverId) => {
  const tripId = Number(request.params.tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) return void response.status(400).json({ error: 'tripId must be a positive integer.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    await oracleDriverCompleteTrip(driverId, tripId);
  } else {
    const trip = database.trips.find((item) => item.id === tripId);
    if (!trip) return void response.status(404).json({ error: 'Trip was not found.' });
    if (trip.driverId !== driverId) return void response.status(400).json({ error: 'Trip is not assigned to this driver.' });
    if (trip.status !== 'in_progress') return void response.status(400).json({ error: 'Only in-progress trips can be completed.' });
    trip.status = 'completed';
    trip.arrivalTime = new Date().toISOString();
    database.bookings.filter((booking) => booking.tripId === tripId && booking.status === 'confirmed').forEach((booking) => { booking.status = 'completed'; });
    const driver = database.drivers.find((item) => item.id === driverId);
    if (driver) { driver.totalTrips += 1; driver.status = 'available'; }
  }
  return void response.json({ tripId, status: 'completed' });
}));

app.get('/api/driver/vehicle', requireActingDriver, driverEndpoint(async (_request, response, driverId) => {
  if (process.env.DATABASE_MODE === 'oracle') return void response.json(await oracleDriverVehicle(driverId));
  const preferredTrip = database.trips.filter((trip) => trip.driverId === driverId).sort((left, right) => {
    const priority = (status: string) => status === 'in_progress' ? 0 : status === 'scheduled' ? 1 : 2;
    return priority(left.status) - priority(right.status) || new Date(left.departureTime).getTime() - new Date(right.departureTime).getTime();
  })[0];
  const vehicle = preferredTrip && database.vehicles.find((item) => item.id === preferredTrip.vehicleId);
  return void response.json(vehicle ? {
    vehicleId: vehicle.id, registrationNumber: vehicle.registrationNumber, make: vehicle.make, model: vehicle.model,
    vehicleType: vehicle.type, seatingCapacity: vehicle.capacity, fuelType: vehicle.fuelType,
    status: vehicle.status, nextMaintenanceDate: vehicle.nextMaintenanceDate,
  } : null);
}));

app.get('/api/driver/feedback-summary', requireActingDriver, driverEndpoint(async (_request, response, driverId) => {
  if (process.env.DATABASE_MODE === 'oracle') return void response.json(await oracleDriverFeedback(driverId));
  const records = database.feedback.filter((item) => item.driverId === driverId).sort((left, right) => String(right.feedbackDate).localeCompare(String(left.feedbackDate)));
  return void response.json({
    averageRating: records.length ? records.reduce((total, item) => total + Number(item.rating), 0) / records.length : null,
    ratingCount: records.length,
    recentComments: records.slice(0, 10).map((item) => ({ feedbackId: item.id, tripId: item.tripId, rating: item.rating, comment: item.comment, feedbackDate: item.feedbackDate })),
  });
}));

app.get('/api/driver/profile', requireActingDriver, driverEndpoint(async (_request, response, driverId) => {
  if (process.env.DATABASE_MODE === 'oracle') {
    const profile = await oracleDriverProfile(driverId);
    if (!profile) return void response.status(404).json({ error: 'Driver was not found.' });
    return void response.json(profile);
  }
  const driver = database.drivers.find((item) => item.id === driverId);
  return void response.json(driver ? driverProfile(driver) : null);
}));

app.put('/api/driver/profile', requireActingDriver, driverEndpoint(async (request, response, driverId) => {
  const phone = request.body.phone === null ? null : String(request.body.phone ?? '').trim() || null;
  const email = request.body.email === null ? null : String(request.body.email ?? '').trim() || null;
  if (phone && phone.length > 20) return void response.status(400).json({ error: 'Phone must be 20 characters or fewer.' });
  if (email && email.length > 100) return void response.status(400).json({ error: 'Email must be 100 characters or fewer.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return void response.status(400).json({ error: 'Email must be a valid email address.' });
  if (process.env.DATABASE_MODE === 'oracle') {
    await oracleDriverUpdateProfile(driverId, phone, email);
    return void response.json(await oracleDriverProfile(driverId));
  }
  const driver = database.drivers.find((item) => item.id === driverId);
  if (!driver) return void response.status(404).json({ error: 'Driver was not found.' });
  if (database.drivers.some((item) => item.id !== driverId && email && item.email?.toLowerCase() === email.toLowerCase())) {
    return void response.status(409).json({ error: 'Email already belongs to another driver.' });
  }
  driver.phone = phone;
  driver.email = email;
  return void response.json(driverProfile(driver));
}));

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
