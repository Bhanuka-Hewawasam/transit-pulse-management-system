import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const oracleMocks = vi.hoisted(() => ({
  health: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  report: vi.fn(),
  passengerExists: vi.fn(),
  passengerSearchTrips: vi.fn(),
  passengerBookings: vi.fn(),
  passengerProfile: vi.fn(),
  passengerBookSeat: vi.fn(),
  passengerBookSeats: vi.fn(),
  passengerPayBooking: vi.fn(),
  passengerPayBookings: vi.fn(),
  passengerCancelBooking: vi.fn(),
  passengerSubmitFeedback: vi.fn(),
  passengerUpdateProfile: vi.fn(),
  driverExists: vi.fn(),
  driverSummary: vi.fn(),
  driverTrips: vi.fn(),
  driverManifest: vi.fn(),
  driverVehicle: vi.fn(),
  driverFeedback: vi.fn(),
  driverProfile: vi.fn(),
  driverStartTrip: vi.fn(),
  driverCompleteTrip: vi.fn(),
  driverUpdateProfile: vi.fn(),
  updateTripStatus: vi.fn(),
}));

const mongoMocks = vi.hoisted(() => ({
  health: vi.fn(),
  content: vi.fn(),
  reviews: vi.fn(),
  createAnnouncement: vi.fn(),
}));

vi.mock('./oracleAdapter.js', () => ({
  oracleHealth: oracleMocks.health,
  oracleList: oracleMocks.list,
  oracleCreate: oracleMocks.create,
  oracleReport: oracleMocks.report,
  oracleUpdate: oracleMocks.update,
  oraclePassengerExists: oracleMocks.passengerExists,
  oraclePassengerSearchTrips: oracleMocks.passengerSearchTrips,
  oraclePassengerBookings: oracleMocks.passengerBookings,
  oraclePassengerProfile: oracleMocks.passengerProfile,
  oraclePassengerBookSeat: oracleMocks.passengerBookSeat,
  oraclePassengerBookSeats: oracleMocks.passengerBookSeats,
  oraclePassengerPayBooking: oracleMocks.passengerPayBooking,
  oraclePassengerPayBookings: oracleMocks.passengerPayBookings,
  oraclePassengerCancelBooking: oracleMocks.passengerCancelBooking,
  oraclePassengerSubmitFeedback: oracleMocks.passengerSubmitFeedback,
  oraclePassengerUpdateProfile: oracleMocks.passengerUpdateProfile,
  oracleDriverExists: oracleMocks.driverExists,
  oracleDriverSummary: oracleMocks.driverSummary,
  oracleDriverTrips: oracleMocks.driverTrips,
  oracleDriverManifest: oracleMocks.driverManifest,
  oracleDriverVehicle: oracleMocks.driverVehicle,
  oracleDriverFeedback: oracleMocks.driverFeedback,
  oracleDriverProfile: oracleMocks.driverProfile,
  oracleDriverStartTrip: oracleMocks.driverStartTrip,
  oracleDriverCompleteTrip: oracleMocks.driverCompleteTrip,
  oracleDriverUpdateProfile: oracleMocks.driverUpdateProfile,
  oracleUpdateTripStatus: oracleMocks.updateTripStatus,
}));

vi.mock('./mongodbAdapter.js', () => ({
  mongodbHealth: mongoMocks.health,
  mongodbContent: mongoMocks.content,
  mongodbCreateAnnouncement: mongoMocks.createAnnouncement,
  mongodbPassengerReviews: mongoMocks.reviews,
}));

import app from './app.js';
import { database } from './database.js';

describe('SmartMove backend API', () => {
  beforeEach(() => {
    process.env.DATABASE_MODE = 'demo';
    vi.clearAllMocks();
    oracleMocks.health.mockResolvedValue({ database: 'Oracle', connected: false, mode: 'demo', message: 'Oracle configuration is incomplete' });
    mongoMocks.health.mockResolvedValue({ database: 'MongoDB', connected: false, mode: 'demo', message: 'MongoDB is not configured' });
    mongoMocks.content.mockResolvedValue({ reviews: [], announcements: [], documents: [], media: [] });
    mongoMocks.reviews.mockResolvedValue([]);
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

  it.each([
    ['/api/reports/most-used-routes?topN=3', 'most-used-routes', { topN: '3' }],
    ['/api/reports/revenue?fromDate=2026-01-01&toDate=2026-01-31', 'revenue', { fromDate: '2026-01-01', toDate: '2026-01-31' }],
    ['/api/reports/passenger-history?passengerId=7', 'passenger-history', { passengerId: '7' }],
    ['/api/reports/maintenance-due?daysAhead=30', 'maintenance-due', { daysAhead: '30' }],
    ['/api/reports/performance', 'performance', undefined],
  ])('dispatches %s to the Oracle report procedure', async (path, report, parameters) => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.report.mockResolvedValue([{ report }]);

    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ report }]);
    if (parameters === undefined) expect(oracleMocks.report).toHaveBeenCalledWith(report);
    else expect(oracleMocks.report).toHaveBeenCalledWith(report, parameters);
  });

  it('maps Oracle report application errors to readable HTTP 400 responses', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.report.mockRejectedValue(Object.assign(new Error('ORA-20001: topN must be non-negative'), { code: 'ORA-20001', errorNum: 20001 }));

    const response = await request(app).get('/api/reports/most-used-routes?topN=-1');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('topN must be non-negative');
  });

  it('returns a safe actionable JSON message and log for an undeclared report procedure', async () => {
    process.env.DATABASE_MODE = 'oracle';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    oracleMocks.report.mockRejectedValue(Object.assign(
      new Error("ORA-06550: line 1, column 7:\nPLS-00201: identifier 'REPORT_MOST_USED_ROUTES' must be declared"),
      { code: 'ORA-06550', errorNum: 6550 },
    ));

    const response = await request(app).get('/api/reports/most-used-routes?topN=5');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Oracle procedure REPORT_MOST_USED_ROUTES is missing or not visible to the application schema. Run database/oracle/07_report_procedures.sql in that schema.',
      code: 'ORA-06550',
      detail: "PLS-00201: identifier 'REPORT_MOST_USED_ROUTES' must be declared",
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|connect string/i);
    expect(log).toHaveBeenCalledWith("Oracle request failed with ORA-06550: PLS-00201: identifier 'REPORT_MOST_USED_ROUTES' must be declared");
    log.mockRestore();
  });

  it('merges MongoDB review averages onto Oracle route revenue by route id', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.report.mockResolvedValue([{ routeId: 4, routeCode: 'R004', paidRevenue: 1250 }]);
    mongoMocks.health.mockResolvedValue({ database: 'MongoDB', connected: true, mode: 'mongodb', message: 'connected' });
    mongoMocks.reviews.mockResolvedValue([
      { routeCode: 'R004', rating: 5 }, { routeCode: 'R004', rating: 3 }, { routeCode: 'UNKNOWN', rating: 1 },
    ]);

    const response = await request(app).get('/api/reports/route-revenue-ratings');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ routeId: 4, routeCode: 'R004', paidRevenue: 1250, averageReviewRating: 4, reviewCount: 2, reviewSourceAvailable: true }]);
    expect(mongoMocks.reviews).toHaveBeenCalledOnce();
  });

  it('serves MongoDB-style demo content', async () => {
    const response = await request(app).get('/api/mongodb/content');
    expect(response.status).toBe(200);
    expect(response.body.demo).toBe(true);
    expect(response.body.reviews.length).toBeGreaterThan(0);
  });

  it('creates a travel announcement through the MongoDB adapter', async () => {
    const payload = {
      title: 'Route update', message: 'Expect delays this afternoon.', audience: 'drivers', startDate: '2026-09-30', endDate: '2026-10-01',
      priority: 'high', status: 'published', routeId: 'R12', tripId: 'T45',
    };
    mongoMocks.health.mockResolvedValue({ database: 'MongoDB', connected: true, mode: 'mongodb', message: 'connected' });
    mongoMocks.createAnnouncement.mockResolvedValue({ ...payload, id: 'announcement-2', active: true, createdAt: '2026-09-29T00:00:00.000Z' });

    const response = await request(app).post('/api/mongodb/announcements').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ...payload, id: 'announcement-2', active: true });
    expect(mongoMocks.createAnnouncement).toHaveBeenCalledWith(payload);
  });

  it('rejects announcements with invalid fields before writing', async () => {
    const response = await request(app).post('/api/mongodb/announcements').send({
      title: 'Route update', message: 'A message', audience: 'all', startDate: '2026-09-30', endDate: '2026-09-29', priority: 'urgent', status: 'published',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('endDate must be on or after startDate');
    expect(mongoMocks.createAnnouncement).not.toHaveBeenCalled();
  });

  it('rejects announcements with an unsupported audience', async () => {
    const response = await request(app).post('/api/mongodb/announcements').send({
      title: 'Route update', message: 'A message', audience: 'staff', startDate: '2026-09-30', priority: 'normal', status: 'draft',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('audience must be all, passengers, or drivers');
    expect(mongoMocks.createAnnouncement).not.toHaveBeenCalled();
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

  it('requires an existing acting passenger and scopes profile and booking reads to the header', async () => {
    const passenger = database.passengers[0];
    const otherPassenger = database.passengers[1];
    const original = { firstName: passenger.firstName, lastName: passenger.lastName, phone: passenger.phone, address: passenger.address };
    const otherName = otherPassenger.firstName;
    try {
      const missingHeader = await request(app).get('/api/passenger/bookings');
      const invalidHeader = await request(app).get('/api/passenger/bookings').set('X-Passenger-Id', 'not-an-id');
      const missingPassenger = await request(app).get('/api/passenger/bookings').set('X-Passenger-Id', '99999999');
      const ownedBookings = await request(app).get('/api/passenger/bookings').set('X-Passenger-Id', String(passenger.id));
      const profileUpdate = await request(app).put('/api/passenger/profile').set('X-Passenger-Id', String(passenger.id)).send({
        passengerId: otherPassenger.id, firstName: 'Acting', lastName: 'Passenger', phone: '0770000000', address: 'Test address',
      });

      expect(missingHeader.status).toBe(400);
      expect(invalidHeader.status).toBe(400);
      expect(missingPassenger.status).toBe(404);
      expect(ownedBookings.status).toBe(200);
      expect(ownedBookings.body.map((booking: { bookingId: number }) => booking.bookingId).sort((a: number, b: number) => a - b))
        .toEqual(database.bookings.filter((booking) => booking.passengerId === passenger.id).map((booking) => booking.id).sort((a, b) => a - b));
      expect(profileUpdate.status).toBe(200);
      expect(profileUpdate.body.passengerId).toBe(passenger.id);
      expect(profileUpdate.body.firstName).toBe('Acting');
      expect(otherPassenger.firstName).toBe(otherName);
    } finally {
      Object.assign(passenger, original);
    }
  });

  it('uses the verified Oracle passenger header and ignores body passengerId for booking', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.passengerExists.mockResolvedValue(true);
    oracleMocks.passengerBookSeat.mockResolvedValue(81);

    const response = await request(app).post('/api/passenger/bookings')
      .set('X-Passenger-Id', '7')
      .send({ passengerId: 999, tripId: 12, seatNumber: '4', amount: 0, status: 'confirmed' });

    expect(response.status).toBe(201);
    expect(oracleMocks.passengerExists).toHaveBeenCalledWith(7);
    expect(oracleMocks.passengerBookSeat).toHaveBeenCalledWith(7, 12, '4');
    expect(response.body).toEqual({ bookingId: 81, tripId: 12, status: 'pending' });
  });

  it('forwards multi-seat bookings and aggregate payments to Oracle', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.passengerExists.mockResolvedValue(true);
    oracleMocks.passengerBookSeats.mockResolvedValue({
      bookingId: 81, bookingIds: [81, 82], seatNumbers: ['1', '2'], seatCount: 2, amount: 1000,
    });
    const booking = await request(app).post('/api/passenger/bookings').set('X-Passenger-Id', '7')
      .send({ tripId: 12, seatCount: 2, amount: 1000, pickupPoint: 'Colombo', dropoffPoint: 'Kandy' });
    expect(booking.status).toBe(201);
    expect(oracleMocks.passengerBookSeats).toHaveBeenCalledWith(7, 12, 2, 1000, 'Colombo', 'Kandy');
    expect(booking.body).toMatchObject({ bookingIds: [81, 82], amount: 1000, seatCount: 2 });

    oracleMocks.passengerPayBookings.mockResolvedValue(undefined);
    const payment = await request(app).post('/api/passenger/payments').set('X-Passenger-Id', '7')
      .send({ bookingIds: [81, 82], amount: 1000, method: 'card' });
    expect(payment.status).toBe(200);
    expect(oracleMocks.passengerPayBookings).toHaveBeenCalledWith(7, [81, 82], 1000, 'card');
    expect(payment.body).toMatchObject({ bookingIds: [81, 82], amount: 1000, paymentStatus: 'paid' });
  });

  it('books multiple seats at the calculated total and pays the whole group in demo mode', async () => {
    const passenger = database.passengers[0];
    const trip = database.trips.find((candidate) => candidate.totalSeats >= 2)!;
    const route = database.routes.find((item) => item.id === trip.routeId)!;
    const originalTrip = { status: trip.status, departureTime: trip.departureTime, availableSeats: trip.availableSeats };
    const originalBookings = [...database.bookings];
    const originalBookingStatuses = new Map(database.bookings.map((booking) => [booking.id, booking.status]));
    const originalPayments = [...database.payments];
    const originalTotalBookings = passenger.totalBookings;
    try {
      trip.status = 'scheduled';
      trip.departureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      trip.availableSeats = trip.totalSeats;
      database.bookings.filter((booking) => booking.tripId === trip.id && ['pending', 'confirmed'].includes(booking.status))
        .forEach((booking) => { booking.status = 'cancelled'; });
      const passengerHeader = { 'X-Passenger-Id': String(passenger.id) };
      const pickupPoint = route.stops[0];
      const dropoffPoint = route.destination;
      const segmentFare = Math.round(route.fareAmount * route.stops.length / (route.stops.length + 1) * 100) / 100;
      const amount = segmentFare * 2;

      trip.availableSeats = 1;

      const overCapacity = await request(app).post('/api/passenger/bookings').set(passengerHeader)
        .send({ tripId: trip.id, seatCount: 2, amount, pickupPoint, dropoffPoint });
      expect(overCapacity.status).toBe(400);
      expect(overCapacity.body.error).toMatch(/Only 1 seats are available/);

      trip.availableSeats = trip.totalSeats;
      const wrongBookingAmount = await request(app).post('/api/passenger/bookings').set(passengerHeader)
        .send({ tripId: trip.id, seatCount: 2, amount: route.fareAmount, pickupPoint, dropoffPoint });
      expect(wrongBookingAmount.status).toBe(400);
      expect(wrongBookingAmount.body.error).toMatch(/segment fare multiplied by the seat count/);

      const reverseStops = await request(app).post('/api/passenger/bookings').set(passengerHeader)
        .send({ tripId: trip.id, seatCount: 2, amount, pickupPoint: dropoffPoint, dropoffPoint: route.origin });
      expect(reverseStops.status).toBe(400);
      expect(reverseStops.body.error).toMatch(/must come before/);

      const booking = await request(app).post('/api/passenger/bookings').set(passengerHeader)
        .send({ tripId: trip.id, seatCount: 2, amount, pickupPoint, dropoffPoint });
      expect(booking.status).toBe(201);
      expect(booking.body).toMatchObject({ seatCount: 2, amount, segmentFare, seatNumbers: ['1', '2'] });
      expect(booking.body.bookingIds).toHaveLength(2);
      expect(new Set(booking.body.bookingIds).size).toBe(2);
      expect(trip.availableSeats).toBe(trip.totalSeats - 2);
      expect(database.bookings.filter((record) => booking.body.bookingIds.includes(record.id)).map((record) => record.amount))
        .toEqual([segmentFare, segmentFare]);

      const wrongPaymentAmount = await request(app).post('/api/passenger/payments').set(passengerHeader)
        .send({ bookingIds: booking.body.bookingIds, amount: segmentFare, method: 'card' });
      expect(wrongPaymentAmount.status).toBe(400);
      expect(wrongPaymentAmount.body.error).toMatch(/total booking amount/);

      const payment = await request(app).post('/api/passenger/payments').set(passengerHeader)
        .send({ bookingIds: booking.body.bookingIds, amount, method: 'card' });
      expect(payment.status).toBe(200);
      expect(payment.body).toMatchObject({ bookingIds: booking.body.bookingIds, amount, paymentStatus: 'paid' });
      expect(database.bookings.filter((record) => booking.body.bookingIds.includes(record.id)).every((record) => record.status === 'confirmed')).toBe(true);
      expect(database.payments.filter((record) => booking.body.bookingIds.includes(record.bookingId)).map((record) => record.amount))
        .toEqual([segmentFare, segmentFare]);
      expect(passenger.totalBookings).toBe(originalTotalBookings + 2);
    } finally {
      database.bookings.splice(0, database.bookings.length, ...originalBookings);
      for (const booking of originalBookings) booking.status = originalBookingStatuses.get(booking.id) ?? booking.status;
      database.payments.splice(0, database.payments.length, ...originalPayments);
      Object.assign(trip, originalTrip);
      passenger.totalBookings = originalTotalBookings;
    }
  });

  it('accepts the exact four-seat total for a fare of 435', async () => {
    const passenger = database.passengers[0];
    const trip = database.trips.find((candidate) => candidate.totalSeats >= 4)!;
    const route = database.routes.find((item) => item.id === trip.routeId)!;
    const originalFare = route.fareAmount;
    const originalTrip = { status: trip.status, departureTime: trip.departureTime, availableSeats: trip.availableSeats };
    const originalBookings = [...database.bookings];
    const originalBookingStatuses = new Map(database.bookings.map((booking) => [booking.id, booking.status]));
    const originalPayments = [...database.payments];
    try {
      route.fareAmount = 435;
      trip.status = 'scheduled';
      trip.departureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      trip.availableSeats = trip.totalSeats;
      database.bookings.filter((booking) => booking.tripId === trip.id && ['pending', 'confirmed'].includes(booking.status))
        .forEach((booking) => { booking.status = 'cancelled'; });

      const response = await request(app).post('/api/passenger/bookings')
        .set('X-Passenger-Id', String(passenger.id))
        .send({ tripId: trip.id, seatCount: 4, amount: 1740, pickupPoint: route.origin, dropoffPoint: route.destination });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(1740);
      expect(response.body.seatCount).toBe(4);
      expect(database.bookings.filter((booking) => response.body.bookingIds.includes(booking.id))
        .reduce((total, booking) => total + booking.amount, 0)).toBe(1740);
    } finally {
      database.bookings.splice(0, database.bookings.length, ...originalBookings);
      for (const booking of originalBookings) booking.status = originalBookingStatuses.get(booking.id) ?? booking.status;
      database.payments.splice(0, database.payments.length, ...originalPayments);
      Object.assign(trip, originalTrip);
      route.fareAmount = originalFare;
    }
  });

  it('passes Oracle passenger search filters and maps procedure errors to HTTP 400', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.passengerExists.mockResolvedValue(true);
    oracleMocks.passengerSearchTrips.mockResolvedValue([{ tripId: 12, origin: 'Colombo', destination: 'Kandy' }]);

    const response = await request(app).get('/api/passenger/trips?origin=Colombo&destination=Kandy&date=2026-09-28').set('X-Passenger-Id', '7');
    expect(response.status).toBe(200);
    expect(oracleMocks.passengerSearchTrips).toHaveBeenCalledWith({ origin: 'Colombo', destination: 'Kandy', date: '2026-09-28' });

    oracleMocks.passengerBookSeat.mockRejectedValue(Object.assign(new Error('ORA-20114: Trip has already departed'), { code: 'ORA-20114', errorNum: 20114 }));
    const rejectedBooking = await request(app).post('/api/passenger/bookings').set('X-Passenger-Id', '7').send({ tripId: 12, seatNumber: '4' });
    expect(rejectedBooking.status).toBe(400);
    expect(rejectedBooking.body.error).toBe('Trip has already departed');
  });

  it('enforces passenger booking, payment, cancellation, and feedback rules in demo mode', async () => {
    const passenger = database.passengers[0];
    const otherPassenger = database.passengers[1];
    const trip = database.trips.find((candidate) => !database.bookings.some((booking) => booking.tripId === candidate.id && booking.passengerId === passenger.id && ['pending', 'confirmed'].includes(booking.status))
      && database.bookings.some((booking) => booking.tripId === candidate.id && booking.passengerId !== passenger.id && ['pending', 'confirmed'].includes(booking.status)))!;
    const route = database.routes.find((item) => item.id === trip.routeId);
    const originalTrip = { status: trip.status, departureTime: trip.departureTime, availableSeats: trip.availableSeats };
    const originalBookings = [...database.bookings];
    const originalPayments = [...database.payments];
    const originalFeedback = [...database.feedback];
    const originalCounts = new Map(database.passengers.map((item) => [item.id, item.totalBookings]));
    try {
      trip.status = 'scheduled';
      trip.departureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      trip.availableSeats = trip.totalSeats;
      const occupiedSeats = new Set(database.bookings.filter((item) => item.tripId === trip.id && ['pending', 'confirmed'].includes(item.status))
        .map((item) => Number(item.seatNumber.match(/[0-9]+/)?.[0])).filter(Number.isFinite));
      const seatNumber = Array.from({ length: trip.totalSeats }, (_, index) => index + 1).find((seat) => !occupiedSeats.has(seat));
      expect(seatNumber).toBeDefined();
      const passengerHeader = { 'X-Passenger-Id': String(passenger.id) };
      const existingSeatNumber = Number(database.bookings.find((item) => item.tripId === trip.id && item.passengerId !== passenger.id && ['pending', 'confirmed'].includes(item.status))?.seatNumber.match(/[0-9]+/)?.[0]);
      const existingAlphanumericSeat = await request(app).post('/api/passenger/bookings').set(passengerHeader).send({ tripId: trip.id, seatNumber: String(existingSeatNumber) });
      expect(existingAlphanumericSeat.status).toBe(400);
      expect(existingAlphanumericSeat.body.error).toMatch(/seat is already booked/);

      const booking = await request(app).post('/api/passenger/bookings').set(passengerHeader).send({
        passengerId: otherPassenger.id, tripId: trip.id, seatNumber: String(seatNumber), amount: 0, status: 'confirmed',
      });
      expect(booking.status).toBe(201);
      expect(booking.body).toMatchObject({ tripId: trip.id, status: 'pending', amount: route?.fareAmount });
      const bookingId = booking.body.bookingId as number;

      const doubleBooking = await request(app).post('/api/passenger/bookings').set(passengerHeader).send({ tripId: trip.id, seatNumber: String(Number(seatNumber) + 1) });
      expect(doubleBooking.status).toBe(400);
      expect(doubleBooking.body.error).toMatch(/active booking/);
      const takenSeat = await request(app).post('/api/passenger/bookings').set('X-Passenger-Id', String(otherPassenger.id)).send({ tripId: trip.id, seatNumber: String(seatNumber) });
      expect(takenSeat.status).toBe(400);
      expect(takenSeat.body.error).toMatch(/seat is already booked/);
      const outOfRangeSeat = await request(app).post('/api/passenger/bookings').set('X-Passenger-Id', String(otherPassenger.id)).send({ tripId: trip.id, seatNumber: String(trip.totalSeats + 1) });
      expect(outOfRangeSeat.status).toBe(400);
      expect(outOfRangeSeat.body.error).toMatch(/trip capacity/);

      const freeSeat = Array.from({ length: trip.totalSeats }, (_, index) => index + 1).find((seat) => seat !== Number(seatNumber) && !occupiedSeats.has(seat));
      trip.availableSeats = 0;
      const fullTrip = await request(app).post('/api/passenger/bookings').set('X-Passenger-Id', String(otherPassenger.id)).send({ tripId: trip.id, seatNumber: String(freeSeat) });
      expect(fullTrip.status).toBe(400);
      expect(fullTrip.body.error).toMatch(/Trip is full/);
      trip.availableSeats = trip.totalSeats - 1;

      const earlyFeedback = await request(app).post('/api/passenger/feedback').set(passengerHeader).send({ tripId: trip.id, rating: 5, comment: 'Not completed yet' });
      expect(earlyFeedback.status).toBe(400);
      expect(earlyFeedback.body.error).toMatch(/completed trips/);
      trip.status = 'completed';
      const completedFeedback = await request(app).post('/api/passenger/feedback').set(passengerHeader).send({ tripId: trip.id, rating: 5, comment: 'Completed trip' });
      expect(completedFeedback.status).toBe(201);
      const duplicateFeedback = await request(app).post('/api/passenger/feedback').set(passengerHeader).send({ tripId: trip.id, rating: 4, comment: 'Duplicate' });
      expect(duplicateFeedback.status).toBe(400);
      expect(duplicateFeedback.body.error).toMatch(/already submitted feedback/);

      trip.status = 'scheduled';
      const wrongAmount = await request(app).post('/api/passenger/payments').set(passengerHeader).send({ bookingId, amount: 0, method: 'cash' });
      expect(wrongAmount.status).toBe(400);
      expect(wrongAmount.body.error).toMatch(/must equal/);
      const someoneElsePayment = await request(app).post('/api/passenger/payments').set('X-Passenger-Id', String(otherPassenger.id)).send({ bookingId, amount: route?.fareAmount, method: 'cash' });
      expect(someoneElsePayment.status).toBe(400);
      expect(someoneElsePayment.body.error).toMatch(/does not belong/);
      const payment = await request(app).post('/api/passenger/payments').set(passengerHeader).send({ bookingId, amount: route?.fareAmount, method: 'cash' });
      expect(payment.status).toBe(200);
      expect(database.bookings.find((item) => item.id === bookingId)?.status).toBe('confirmed');
      const duplicatePayment = await request(app).post('/api/passenger/payments').set(passengerHeader).send({ bookingId, amount: route?.fareAmount, method: 'cash' });
      expect(duplicatePayment.status).toBe(400);

      trip.departureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const tooLate = await request(app).post(`/api/passenger/bookings/${bookingId}/cancel`).set(passengerHeader);
      expect(tooLate.status).toBe(400);
      expect(tooLate.body.error).toMatch(/within two hours/);
      const someoneElseCancellation = await request(app).post(`/api/passenger/bookings/${bookingId}/cancel`).set('X-Passenger-Id', String(otherPassenger.id));
      expect(someoneElseCancellation.status).toBe(400);
      trip.departureTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const cancellation = await request(app).post(`/api/passenger/bookings/${bookingId}/cancel`).set(passengerHeader);
      expect(cancellation.status).toBe(200);
      expect(database.bookings.find((item) => item.id === bookingId)?.status).toBe('cancelled');
      expect(database.payments.find((item) => item.bookingId === bookingId)?.status).toBe('refunded');
      expect(trip.availableSeats).toBe(trip.totalSeats);
      expect(database.passengers.find((item) => item.id === passenger.id)?.totalBookings).toBe(originalCounts.get(passenger.id));
    } finally {
      database.bookings.splice(0, database.bookings.length, ...originalBookings);
      database.payments.splice(0, database.payments.length, ...originalPayments);
      database.feedback.splice(0, database.feedback.length, ...originalFeedback);
      Object.assign(trip, originalTrip);
      for (const item of database.passengers) item.totalBookings = originalCounts.get(item.id) ?? item.totalBookings;
    }
  });

  it('requires an acting driver and uses only the header for Oracle profile access', async () => {
    process.env.DATABASE_MODE = 'oracle';
    const driver = database.drivers[0];
    const otherDriver = database.drivers[1];
    oracleMocks.driverExists.mockResolvedValue(true);
    oracleMocks.driverProfile.mockResolvedValue({ driverId: driver.id, firstName: 'Kamal', lastName: 'Perera', phone: '071-000-0000', email: 'kamal@example.com', licenseNumber: driver.licenseNumber, licenseExpiry: driver.licenseExpiry, status: 'available', rating: 4.7, totalTrips: 312 });
    oracleMocks.driverUpdateProfile.mockResolvedValue(undefined);

    const missing = await request(app).get('/api/driver/profile');
    const invalid = await request(app).get('/api/driver/profile').set('X-Driver-Id', 'nope');
    const profile = await request(app).put('/api/driver/profile').set('X-Driver-Id', String(driver.id)).send({ driverId: otherDriver.id, phone: '071-000-0000', email: 'kamal@example.com' });

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(profile.status).toBe(200);
    expect(oracleMocks.driverExists).toHaveBeenCalledWith(driver.id);
    expect(oracleMocks.driverUpdateProfile).toHaveBeenCalledWith(driver.id, '071-000-0000', 'kamal@example.com');
    expect(oracleMocks.driverUpdateProfile).not.toHaveBeenCalledWith(otherDriver.id, expect.anything(), expect.anything());
  });

  it('dispatches driver trips and maps Oracle application errors to HTTP 400', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.driverExists.mockResolvedValue(true);
    oracleMocks.driverTrips.mockResolvedValue([{ tripId: 14, canStart: true }]);
    const trips = await request(app).get('/api/driver/trips?filter=upcoming').set('X-Driver-Id', '3');
    expect(trips.status).toBe(200);
    expect(oracleMocks.driverTrips).toHaveBeenCalledWith(3, 'upcoming');

    oracleMocks.driverStartTrip.mockRejectedValue(Object.assign(new Error('ORA-20205: Driver already has another in-progress trip'), { code: 'ORA-20205', errorNum: 20205 }));
    const rejected = await request(app).post('/api/driver/trips/14/start').set('X-Driver-Id', '3').send({ driverId: 999 });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toBe('Driver already has another in-progress trip');
    expect(oracleMocks.driverStartTrip).toHaveBeenCalledWith(3, 14);
  });

  it('enforces driver trip ownership, start window, concurrency, manifest and completion in demo mode', async () => {
    const driver = database.drivers[0];
    const trip = database.trips.find((item) => item.driverId === driver.id)!;
    const otherTrip = database.trips.find((item) => item.driverId !== driver.id)!;
    const otherDriver = database.drivers.find((item) => item.id === otherTrip.driverId)!;
    const secondTrip = database.trips.find((item) => item.driverId === driver.id && item.id !== trip.id)!;
    const originalTrips = [trip, secondTrip].map((item) => ({ id: item.id, status: item.status, departureTime: item.departureTime, arrivalTime: item.arrivalTime }));
    const originalOtherStatus = otherTrip.status;
    const originalBookingStatuses = database.bookings.map((booking) => ({ id: booking.id, status: booking.status }));
    const originalDriver = { status: driver.status, totalTrips: driver.totalTrips };
    try {
      trip.status = 'scheduled';
      trip.departureTime = new Date(Date.now() + 31 * 60 * 1000).toISOString();
      secondTrip.status = 'scheduled';
      secondTrip.departureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const header = { 'X-Driver-Id': String(driver.id) };
      const tooEarly = await request(app).post(`/api/driver/trips/${trip.id}/start`).set(header);
      expect(tooEarly.status).toBe(400);
      expect(tooEarly.body.error).toMatch(/within 30 minutes/);

      trip.departureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const started = await request(app).post(`/api/driver/trips/${trip.id}/start`).set(header).send({ driverId: otherDriver.id });
      expect(started.status).toBe(200);
      expect(trip.status).toBe('in_progress');
      expect(driver.status).toBe('on_trip');

      const secondStart = await request(app).post(`/api/driver/trips/${secondTrip.id}/start`).set(header);
      expect(secondStart.status).toBe(400);
      expect(secondStart.body.error).toMatch(/another in-progress trip/);

      const manifest = await request(app).get(`/api/driver/trips/${trip.id}/manifest`).set(header);
      const foreignManifest = await request(app).get(`/api/driver/trips/${otherTrip.id}/manifest`).set(header);
      expect(manifest.status).toBe(200);
      expect(foreignManifest.status).toBe(404);
      expect(manifest.body.every((row: { passengerId: number }) => database.bookings.some((booking) => booking.tripId === trip.id && booking.passengerId === row.passengerId))).toBe(true);

      const inProgress = await request(app).get('/api/driver/trips?filter=in_progress').set(header);
      expect(inProgress.body).toEqual(expect.arrayContaining([expect.objectContaining({ tripId: trip.id, canComplete: true })]));
      const completed = await request(app).post(`/api/driver/trips/${trip.id}/complete`).set(header);
      expect(completed.status).toBe(200);
      expect(trip.status).toBe('completed');
      expect(database.bookings.filter((booking) => booking.tripId === trip.id && ['confirmed', 'completed'].includes(booking.status)).every((booking) => booking.status === 'completed')).toBe(true);
      expect(driver.totalTrips).toBe(originalDriver.totalTrips + 1);
      expect(driver.status).toBe('available');
    } finally {
      for (const snapshot of originalTrips) {
        const item = database.trips.find((candidate) => candidate.id === snapshot.id)!;
        item.status = snapshot.status;
        item.departureTime = snapshot.departureTime;
        item.arrivalTime = snapshot.arrivalTime;
      }
      otherTrip.status = originalOtherStatus;
      for (const snapshot of originalBookingStatuses) {
        const item = database.bookings.find((candidate) => candidate.id === snapshot.id);
        if (item) item.status = snapshot.status as typeof item.status;
      }
      driver.status = originalDriver.status;
      driver.totalTrips = originalDriver.totalTrips;
    }
  });

  it('requires an acting driver and maps Oracle driver procedure errors', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.driverExists.mockResolvedValue(true);
    oracleMocks.driverSummary.mockResolvedValue({ driverId: 3, firstName: 'Test', lastName: 'Driver', status: 'available', todayTrips: 0, upcomingTrips: 2, completedTrips: 1, averageRating: 4.5, ratingCount: 2 });
    oracleMocks.driverStartTrip.mockRejectedValue(Object.assign(new Error('ORA-20205: Driver already has another in-progress trip'), { code: 'ORA-20205', errorNum: 20205 }));

    const missingHeader = await request(app).get('/api/driver/summary');
    const summary = await request(app).get('/api/driver/summary').set('X-Driver-Id', '3');
    const rejectedStart = await request(app).post('/api/driver/trips/14/start').set('X-Driver-Id', '3').send({ driverId: 99 });

    expect(missingHeader.status).toBe(400);
    expect(summary.status).toBe(200);
    expect(oracleMocks.driverExists).toHaveBeenCalledWith(3);
    expect(oracleMocks.driverSummary).toHaveBeenCalledWith(3);
    expect(rejectedStart.status).toBe(400);
    expect(rejectedStart.body.error).toBe('Driver already has another in-progress trip');
    expect(oracleMocks.driverStartTrip).toHaveBeenCalledWith(3, 14);
  });

  it('enforces driver trip timing, single active trip, scoped manifests, and completion in demo mode', async () => {
    const driver = database.drivers[0];
    const trip = database.trips.find((item) => item.driverId === driver.id)!;
    const secondTrip = database.trips.find((item) => item.driverId === driver.id && item.id !== trip.id)!;
    const foreignTrip = database.trips.find((item) => item.driverId !== driver.id)!;
    const originalTrips = [trip, secondTrip, foreignTrip].map((item) => ({ id: item.id, status: item.status, departureTime: item.departureTime, arrivalTime: item.arrivalTime }));
    const originalBookings = database.bookings.map((booking) => ({ id: booking.id, status: booking.status }));
    const originalDriver = { status: driver.status, totalTrips: driver.totalTrips };
    try {
      trip.status = 'scheduled';
      trip.departureTime = new Date(Date.now() + 31 * 60 * 1000).toISOString();
      secondTrip.status = 'scheduled';
      secondTrip.departureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const header = { 'X-Driver-Id': String(driver.id) };
      const tooEarly = await request(app).post(`/api/driver/trips/${trip.id}/start`).set(header);
      expect(tooEarly.status).toBe(400);
      expect(tooEarly.body.error).toMatch(/within 30 minutes/);

      trip.departureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const started = await request(app).post(`/api/driver/trips/${trip.id}/start`).set(header).send({ driverId: foreignTrip.driverId });
      expect(started.status).toBe(200);
      expect(trip.status).toBe('in_progress');
      expect(driver.status).toBe('on_trip');
      const secondStart = await request(app).post(`/api/driver/trips/${secondTrip.id}/start`).set(header);
      expect(secondStart.status).toBe(400);
      expect(secondStart.body.error).toMatch(/another in-progress trip/);

      const ownManifest = await request(app).get(`/api/driver/trips/${trip.id}/manifest`).set(header);
      const foreignManifest = await request(app).get(`/api/driver/trips/${foreignTrip.id}/manifest`).set(header);
      expect(ownManifest.status).toBe(200);
      expect(foreignManifest.status).toBe(404);

      const completed = await request(app).post(`/api/driver/trips/${trip.id}/complete`).set(header);
      expect(completed.status).toBe(200);
      expect(trip.status).toBe('completed');
      expect(database.bookings.filter((booking) => booking.tripId === trip.id && ['confirmed', 'completed'].includes(booking.status)).every((booking) => booking.status === 'completed')).toBe(true);
      expect(driver.totalTrips).toBe(originalDriver.totalTrips + 1);
      expect(driver.status).toBe('available');
    } finally {
      for (const snapshot of originalTrips) {
        const item = database.trips.find((candidate) => candidate.id === snapshot.id)!;
        Object.assign(item, { status: snapshot.status, departureTime: snapshot.departureTime, arrivalTime: snapshot.arrivalTime });
      }
      for (const snapshot of originalBookings) {
        const booking = database.bookings.find((item) => item.id === snapshot.id);
        if (booking) booking.status = snapshot.status as typeof booking.status;
      }
      Object.assign(driver, originalDriver);
    }
  });

  it('returns a clear duplicate-value error from Oracle', async () => {
    process.env.DATABASE_MODE = 'oracle';
    oracleMocks.create.mockRejectedValue(Object.assign(new Error('unique constraint'), { code: 'ORA-00001', errorNum: 1 }));

    const response = await request(app).post('/api/vehicles').send({ registrationNumber: 'DUPLICATE', make: 'Tata', model: 'Bus' });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/unique values already exists/);
  });
});
