import oracledb from 'oracledb';
import { calculateSegmentFare, calculateTotalFare } from '../../src/utils/routeFare.js';

export type DatabaseHealth = { database: 'Oracle'; connected: boolean; mode: 'oracle' | 'demo'; message: string };

const tableMap = {
  vehicles: 'VEHICLES', drivers: 'DRIVERS', routes: 'ROUTES', passengers: 'PASSENGERS',
  trips: 'TRIPS', bookings: 'BOOKINGS', payments: 'PAYMENTS', maintenance: 'MAINTENANCE_RECORDS', feedback: 'FEEDBACK',
} as const;

type Resource = keyof typeof tableMap;
export type OracleReportName = 'most-used-routes' | 'revenue' | 'passenger-history' | 'maintenance-due' | 'performance' | 'route-revenue-ratings';
const primaryKeyMap: Record<Resource, string> = {
  vehicles: 'VEHICLE_ID', drivers: 'DRIVER_ID', routes: 'ROUTE_ID', passengers: 'PASSENGER_ID',
  trips: 'TRIP_ID', bookings: 'BOOKING_ID', payments: 'PAYMENT_ID',
  maintenance: 'MAINTENANCE_ID', feedback: 'FEEDBACK_ID',
};
let pool: oracledb.Pool | undefined;

const configured = () => Boolean(process.env.ORACLE_USER && process.env.ORACLE_PASSWORD && process.env.ORACLE_CONNECT_STRING);

async function getPool(): Promise<oracledb.Pool> {
  if (!configured()) throw new Error('Oracle credentials are not configured');
  pool ??= await oracledb.createPool({ user: process.env.ORACLE_USER, password: process.env.ORACLE_PASSWORD, connectString: process.env.ORACLE_CONNECT_STRING, poolMin: 0, poolMax: 4, poolIncrement: 1 });
  return pool;
}

const camelCase = (key: string) => key.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const aliases: Partial<Record<Resource, Record<string, string>>> = {
  vehicles: { vehicleId: 'id', yearOfManufacture: 'year', vehicleType: 'type', seatingCapacity: 'capacity' },
  drivers: { driverId: 'id', licenseExpiryDate: 'licenseExpiry' },
  routes: { routeId: 'id' },
  passengers: { passengerId: 'id', nicOrPassport: 'passportOrNic' },
  trips: { tripId: 'id' },
  bookings: { bookingId: 'id' },
  payments: { paymentId: 'id', paymentMethod: 'method' },
  maintenance: { maintenanceId: 'id' },
  feedback: { feedbackId: 'id', feedbackComment: 'comment' },
};

const mapRow = (resource: Resource, row: Record<string, unknown>) => {
  const mapped = Object.fromEntries(Object.entries(row).map(([key, value]) => [camelCase(key), value]));
  for (const [source, target] of Object.entries(aliases[resource] ?? {})) mapped[target] = mapped[source];
  if (resource === 'routes') mapped.isActive = Boolean(mapped.isActive);
  return mapped;
};

const numberValue = (value: unknown, field: string, fallback?: number): number => {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw Object.assign(new Error(`${field} must be a number`), { statusCode: 400 });
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw Object.assign(new Error(`${field} must be a number`), { statusCode: 400 });
  return parsed;
};

const integerInRange = (value: unknown, field: string, minimum: number, maximum: number): number => {
  const parsed = numberValue(value, field);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw Object.assign(new Error(`${field} must be a whole number between ${minimum} and ${maximum}`), { statusCode: 400 });
  }
  return parsed;
};

const dateValue = (value: unknown, field: string, optional = false): Date | null => {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${field} must be a valid date`), { statusCode: 400 });
  return parsed;
};

const optionalDate = (value: unknown): Date | null => value ? dateValue(value, 'date', true) : null;

const routeStops = (value: unknown): string[] => {
  const entries = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return entries.map(String).map((stop) => stop.trim()).filter(Boolean);
};

export async function oracleHealth(): Promise<DatabaseHealth> {
  const mode = process.env.DATABASE_MODE === 'oracle' ? 'oracle' : 'demo';
  if (!configured()) return { database: 'Oracle', connected: false, mode, message: 'Oracle configuration is incomplete' };
  try {
    const connection = await (await getPool()).getConnection();
    await connection.execute('SELECT 1 AS HEALTH_CHECK FROM dual');
    await connection.close();
    return { database: 'Oracle', connected: true, mode: 'oracle', message: 'Oracle connection is healthy' };
  } catch {
    return { database: 'Oracle', connected: false, mode, message: 'Oracle connection failed' };
  }
}

export async function oracleList(resource: Resource): Promise<Record<string, unknown>[]> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(`SELECT * FROM ${tableMap[resource]}`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const records = (result.rows ?? []).map((row) => mapRow(resource, row));
    if (resource === 'routes') {
      const stops = await connection.execute<Record<string, unknown>>(
        'SELECT route_id, stop_name FROM ROUTE_STOPS ORDER BY route_id, stop_order',
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const stopsByRoute = new Map<number, string[]>();
      for (const stop of stops.rows ?? []) {
        const routeId = Number(stop.ROUTE_ID);
        stopsByRoute.set(routeId, [...(stopsByRoute.get(routeId) ?? []), String(stop.STOP_NAME)]);
      }
      for (const record of records) record.stops = stopsByRoute.get(Number(record.id)) ?? [];
    }
    return records;
  } finally {
    await connection.close();
  }
}

const reportInteger = (value: unknown, name: string, minimum: number): number => {
  const parsed = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isInteger(parsed) || parsed < minimum) {
    throw Object.assign(new Error(`${name} must be an integer of at least ${minimum}`), { statusCode: 400 });
  }
  return parsed;
};

export async function oracleReport(
  report: OracleReportName,
  parameters: { topN?: unknown; fromDate?: unknown; toDate?: unknown; passengerId?: unknown; daysAhead?: unknown } = {},
): Promise<Record<string, unknown>[]> {
  let procedure: string;
  let binds: Record<string, unknown>;
  switch (report) {
    case 'most-used-routes':
      procedure = 'BEGIN REPORT_MOST_USED_ROUTES(:p_top_n, :p_results); END;';
      binds = { p_top_n: reportInteger(parameters.topN, 'topN', 0) };
      break;
    case 'revenue': {
      const fromDate = dateValue(parameters.fromDate, 'fromDate');
      const toDate = dateValue(parameters.toDate, 'toDate');
      if (!fromDate || !toDate) throw Object.assign(new Error('fromDate and toDate are required'), { statusCode: 400 });
      if (fromDate > toDate) throw Object.assign(new Error('fromDate must not be after toDate'), { statusCode: 400 });
      procedure = 'BEGIN REPORT_PAID_REVENUE(:p_from_date, :p_to_date, :p_results); END;';
      binds = { p_from_date: fromDate, p_to_date: toDate };
      break;
    }
    case 'passenger-history':
      procedure = 'BEGIN REPORT_PASSENGER_HISTORY(:p_passenger_id, :p_results); END;';
      binds = { p_passenger_id: reportInteger(parameters.passengerId, 'passengerId', 1) };
      break;
    case 'maintenance-due':
      procedure = 'BEGIN REPORT_VEHICLES_DUE(:p_days_ahead, :p_results); END;';
      binds = { p_days_ahead: reportInteger(parameters.daysAhead, 'daysAhead', 0) };
      break;
    case 'performance':
      procedure = 'BEGIN REPORT_DRIVER_PERFORMANCE(:p_results); END;';
      binds = {};
      break;
    case 'route-revenue-ratings':
      procedure = 'BEGIN REPORT_ROUTE_REVENUE(:p_results); END;';
      binds = {};
      break;
  }

  const connection = await (await getPool()).getConnection();
  let resultSet: oracledb.ResultSet<Record<string, unknown>> | undefined;
  try {
    const result = await connection.execute(procedure, {
      ...binds,
      p_results: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
    } as oracledb.BindParameters, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const outBinds = result.outBinds as { p_results: oracledb.ResultSet<Record<string, unknown>> };
    resultSet = outBinds.p_results;
    const rows = await resultSet.getRows();
    return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [camelCase(key), value])));
  } finally {
    if (resultSet) await resultSet.close();
    await connection.close();
  }
}

export type PassengerTripSearch = { origin?: unknown; destination?: unknown; date?: unknown };

export type PassengerProfile = {
  passengerId: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  email: string;
  passportOrNic: string;
};

async function withPassengerTransaction<T>(operation: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function oraclePassengerExists(passengerId: number): Promise<boolean> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<{ PASSENGER_ID: number }>(
      'SELECT passenger_id FROM passengers WHERE passenger_id = :passengerId',
      { passengerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Boolean(result.rows?.length);
  } finally { await connection.close(); }
}

export async function oraclePassengerSearchTrips(filters: PassengerTripSearch): Promise<Record<string, unknown>[]> {
  const dateInput = filters.date === undefined || filters.date === null || filters.date === '' ? null : String(filters.date);
  if (dateInput && (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput) || !dateValue(dateInput, 'date'))) {
    throw Object.assign(new Error('date must use YYYY-MM-DD format.'), { statusCode: 400 });
  }
  const origin = String(filters.origin ?? '').trim() || null;
  const destination = String(filters.destination ?? '').trim() || null;
  const conditions = ["t.status = 'scheduled'", 't.departure_time > SYSTIMESTAMP', 't.available_seats > 0'];
  const binds: Record<string, unknown> = {};
  if (origin) {
    conditions.push('INSTR(UPPER(r.origin), UPPER(:origin)) > 0');
    binds.origin = origin;
  }
  if (destination) {
    conditions.push('INSTR(UPPER(r.destination), UPPER(:destination)) > 0');
    binds.destination = destination;
  }
  if (dateInput) {
    const nextDay = new Date(`${dateInput}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    conditions.push("t.departure_time >= TO_DATE(:travelDateStart, 'YYYY-MM-DD') AND t.departure_time < TO_DATE(:travelDateEnd, 'YYYY-MM-DD')");
    binds.travelDateStart = dateInput;
    binds.travelDateEnd = nextDay.toISOString().slice(0, 10);
  }
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT t.trip_id, t.route_id, r.route_code, r.origin, r.destination, t.departure_time,
              t.arrival_time, t.available_seats, t.total_seats, r.fare_amount
         FROM trips t JOIN routes r ON r.route_id = t.route_id
        WHERE ${conditions.join('\n          AND ')}
        ORDER BY t.departure_time`,
      binds as oracledb.BindParameters,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return (result.rows ?? []).map((row) => ({
      tripId: row.TRIP_ID, routeId: row.ROUTE_ID, routeCode: row.ROUTE_CODE, origin: row.ORIGIN,
      destination: row.DESTINATION, departureTime: row.DEPARTURE_TIME, arrivalTime: row.ARRIVAL_TIME,
      availableSeats: row.AVAILABLE_SEATS, totalSeats: row.TOTAL_SEATS, fareAmount: row.FARE_AMOUNT,
    }));
  } finally { await connection.close(); }
}

export async function oraclePassengerBookings(passengerId: number): Promise<Record<string, unknown>[]> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT b.booking_id, b.trip_id, b.seat_number, b.booking_date, b.status AS booking_status, b.amount,
              t.status AS trip_status, t.departure_time, t.arrival_time, t.available_seats,
              r.route_id, r.route_code, r.origin, r.destination,
              NVL((SELECT status FROM (
                SELECT py.status FROM payments py WHERE py.booking_id = b.booking_id
                ORDER BY py.payment_date DESC, py.payment_id DESC
              ) WHERE ROWNUM = 1), 'unpaid') AS payment_status,
              CASE WHEN b.status IN ('pending', 'confirmed')
                     AND t.departure_time > SYSTIMESTAMP + INTERVAL '2' HOUR
                   THEN 1 ELSE 0 END AS can_cancel
         FROM bookings b JOIN trips t ON t.trip_id = b.trip_id
         JOIN routes r ON r.route_id = t.route_id
        WHERE b.passenger_id = :passengerId
        ORDER BY t.departure_time DESC, b.booking_date DESC`,
      { passengerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return (result.rows ?? []).map((row) => ({
      bookingId: row.BOOKING_ID, tripId: row.TRIP_ID, seatNumber: row.SEAT_NUMBER,
      bookingDate: row.BOOKING_DATE, bookingStatus: row.BOOKING_STATUS, amount: row.AMOUNT,
      tripStatus: row.TRIP_STATUS, departureTime: row.DEPARTURE_TIME, arrivalTime: row.ARRIVAL_TIME,
      availableSeats: row.AVAILABLE_SEATS, routeId: row.ROUTE_ID, routeCode: row.ROUTE_CODE,
      origin: row.ORIGIN, destination: row.DESTINATION, paymentStatus: row.PAYMENT_STATUS,
      canCancel: Number(row.CAN_CANCEL) === 1,
    }));
  } finally { await connection.close(); }
}

export async function oraclePassengerProfile(passengerId: number): Promise<PassengerProfile | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT passenger_id, first_name, last_name, phone, address, email, nic_or_passport
         FROM passengers WHERE passenger_id = :passengerId`,
      { passengerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    return row ? {
      passengerId: Number(row.PASSENGER_ID), firstName: String(row.FIRST_NAME), lastName: String(row.LAST_NAME),
      phone: row.PHONE === null ? null : String(row.PHONE), address: row.ADDRESS === null ? null : String(row.ADDRESS),
      email: String(row.EMAIL), passportOrNic: String(row.NIC_OR_PASSPORT),
    } : null;
  } finally { await connection.close(); }
}

export async function oraclePassengerBookSeat(passengerId: number, tripId: number, seatNumber: string): Promise<number> {
  return withPassengerTransaction(async (connection) => {
    const result = await connection.execute('BEGIN passenger_book_seat(:passengerId, :tripId, :seatNumber, :bookingId); END;', {
      passengerId, tripId, seatNumber,
      bookingId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    });
    return Number((result.outBinds as { bookingId: number[] }).bookingId[0]);
  });
}

export async function oraclePassengerBookSeats(
  passengerId: number,
  tripId: number,
  seatCount: number,
  expectedAmount: number,
  pickupPoint = '',
  dropoffPoint = '',
): Promise<{ bookingId: number; bookingIds: number[]; seatNumbers: string[]; seatCount: number; amount: number }> {
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    throw Object.assign(new Error('seatCount must be a positive whole number.'), { statusCode: 400 });
  }
  return withPassengerTransaction(async (connection) => {
    const tripResult = await connection.execute<Record<string, unknown>>(
      `SELECT t.status, t.departure_time, t.total_seats, t.available_seats, r.route_id, r.origin, r.destination, r.fare_amount
         FROM trips t JOIN routes r ON r.route_id = t.route_id
        WHERE t.trip_id = :tripId FOR UPDATE OF t.available_seats`,
      { tripId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const trip = tripResult.rows?.[0];
    if (!trip) throw Object.assign(new Error('Trip was not found.'), { statusCode: 404 });
    if (String(trip.STATUS).toLowerCase() !== 'scheduled') {
      throw Object.assign(new Error('Only scheduled trips can be booked.'), { statusCode: 400 });
    }
    const departureTime = trip.DEPARTURE_TIME instanceof Date ? trip.DEPARTURE_TIME.getTime() : Date.parse(String(trip.DEPARTURE_TIME));
    if (!Number.isFinite(departureTime) || departureTime <= Date.now()) {
      throw Object.assign(new Error('Trip has already departed or is not in the future.'), { statusCode: 400 });
    }
    const availableSeats = Number(trip.AVAILABLE_SEATS);
    const totalSeats = Number(trip.TOTAL_SEATS);
    if (seatCount > availableSeats) {
      throw Object.assign(new Error(`Only ${availableSeats} seats are available for this trip.`), { statusCode: 400 });
    }
    const existingPassengerBooking = await connection.execute<{ BOOKING_COUNT: number }>(
      `SELECT COUNT(*) AS booking_count FROM bookings
        WHERE trip_id = :tripId AND passenger_id = :passengerId AND status IN ('pending', 'confirmed')`,
      { tripId, passengerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    if (Number(existingPassengerBooking.rows?.[0]?.BOOKING_COUNT ?? 0) > 0) {
      throw Object.assign(new Error('Passenger already has an active booking on this trip.'), { statusCode: 400 });
    }
    const stopsResult = await connection.execute<{ STOP_NAME: string }>(
      'SELECT stop_name FROM route_stops WHERE route_id = :routeId ORDER BY stop_order',
      { routeId: Number(trip.ROUTE_ID) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const segmentFare = calculateSegmentFare({
      origin: String(trip.ORIGIN),
      destination: String(trip.DESTINATION),
      stops: (stopsResult.rows ?? []).map((row) => String(row.STOP_NAME)),
      fareAmount: Number(trip.FARE_AMOUNT),
    }, pickupPoint, dropoffPoint);
    if (segmentFare === null) {
      throw Object.assign(new Error('Pickup point must come before the drop-off point on this route.'), { statusCode: 400 });
    }
    const totalAmount = calculateTotalFare(segmentFare, seatCount);
    if (totalAmount === null) {
      throw Object.assign(new Error('The fare and seat count could not be calculated.'), { statusCode: 400 });
    }
    if (Math.round(expectedAmount * 100) !== Math.round(totalAmount * 100)) {
      throw Object.assign(new Error('Booking amount must equal the selected route segment fare multiplied by the seat count.'), { statusCode: 400 });
    }
    const occupiedResult = await connection.execute<Record<string, unknown>>(
      `SELECT seat_number FROM bookings
        WHERE trip_id = :tripId AND status IN ('pending', 'confirmed')`,
      { tripId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const occupiedSeats = new Set((occupiedResult.rows ?? []).map((row) => {
      const match = String(row.SEAT_NUMBER ?? '').match(/[0-9]+/);
      return match ? Number(match[0]) : NaN;
    }).filter(Number.isFinite));
    const seatNumbers = Array.from({ length: totalSeats }, (_, index) => index + 1)
      .filter((seat) => !occupiedSeats.has(seat))
      .slice(0, seatCount)
      .map(String);
    if (seatNumbers.length !== seatCount) {
      throw Object.assign(new Error('There are not enough unbooked seats for this request.'), { statusCode: 400 });
    }
    const bookingIds: number[] = [];
    for (const seatNumber of seatNumbers) {
      const sequenceResult = await connection.execute<{ BOOKING_ID: number }>(
        'SELECT seq_bookings_id.NEXTVAL AS booking_id FROM dual',
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const bookingId = Number(sequenceResult.rows?.[0]?.BOOKING_ID);
      await connection.execute(
        `INSERT INTO bookings (booking_id, trip_id, passenger_id, seat_number, booking_date, status, amount)
         VALUES (:bookingId, :tripId, :passengerId, :seatNumber, SYSDATE, 'pending', :amount)`,
        { bookingId, tripId, passengerId, seatNumber, amount: segmentFare },
      );
      bookingIds.push(bookingId);
    }
    await connection.execute(
      'UPDATE trips SET available_seats = available_seats - :seatCount WHERE trip_id = :tripId',
      { seatCount, tripId },
    );
    return { bookingId: bookingIds[0], bookingIds, seatNumbers, seatCount, amount: totalAmount };
  });
}

export async function oraclePassengerPayBooking(passengerId: number, bookingId: number, amount: number, method: string): Promise<void> {
  await withPassengerTransaction((connection) => connection.execute(
    'BEGIN passenger_pay_booking(:passengerId, :bookingId, :amount, :method); END;',
    { passengerId, bookingId, amount, method },
  ).then(() => undefined));
}

export async function oraclePassengerPayBookings(
  passengerId: number,
  bookingIds: number[],
  totalAmount: number,
  method: string,
): Promise<void> {
  if (!bookingIds.length || new Set(bookingIds).size !== bookingIds.length) {
    throw Object.assign(new Error('Unique bookingIds are required.'), { statusCode: 400 });
  }
  await withPassengerTransaction(async (connection) => {
    const idBinds = Object.fromEntries(bookingIds.map((bookingId, index) => [`bookingId${index}`, bookingId]));
    const idParameters = bookingIds.map((_, index) => `:bookingId${index}`).join(', ');
    const bookingsResult = await connection.execute<Record<string, unknown>>(
      `SELECT booking_id, passenger_id, status, amount FROM bookings
        WHERE booking_id IN (${idParameters}) FOR UPDATE`,
      idBinds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const bookingRows = bookingsResult.rows ?? [];
    if (bookingRows.length !== bookingIds.length) {
      throw Object.assign(new Error('A booking was not found.'), { statusCode: 404 });
    }
    if (bookingRows.some((booking) => Number(booking.PASSENGER_ID) !== passengerId)) {
      throw Object.assign(new Error('Booking does not belong to this passenger.'), { statusCode: 400 });
    }
    if (bookingRows.some((booking) => String(booking.STATUS).toLowerCase() !== 'pending')) {
      throw Object.assign(new Error('Only pending bookings can be paid.'), { statusCode: 400 });
    }
    const total = Math.round(bookingRows.reduce((sum, booking) => sum + Number(booking.AMOUNT), 0) * 100) / 100;
    if (Math.round(totalAmount * 100) !== Math.round(total * 100)) {
      throw Object.assign(new Error('Payment amount must equal the total booking amount.'), { statusCode: 400 });
    }
    for (const booking of bookingRows) {
      await connection.execute(
        'BEGIN passenger_pay_booking(:passengerId, :bookingId, :amount, :method); END;',
        { passengerId, bookingId: Number(booking.BOOKING_ID), amount: Number(booking.AMOUNT), method },
      );
    }
  });
}

export async function oraclePassengerCancelBooking(passengerId: number, bookingId: number): Promise<void> {
  await withPassengerTransaction((connection) => connection.execute(
    'BEGIN passenger_cancel_booking(:passengerId, :bookingId); END;', { passengerId, bookingId },
  ).then(() => undefined));
}

export async function oraclePassengerSubmitFeedback(passengerId: number, tripId: number, rating: number, comment: string, category: string): Promise<void> {
  await withPassengerTransaction((connection) => connection.execute(
    'BEGIN passenger_submit_feedback(:passengerId, :tripId, :rating, :comment, :category); END;',
    { passengerId, tripId, rating, comment, category },
  ).then(() => undefined));
}

export async function oraclePassengerUpdateProfile(passengerId: number, profile: Pick<PassengerProfile, 'firstName' | 'lastName' | 'phone' | 'address'>): Promise<void> {
  await withPassengerTransaction((connection) => connection.execute(
    'BEGIN passenger_update_profile(:passengerId, :firstName, :lastName, :phone, :address); END;',
    { passengerId, ...profile },
  ).then(() => undefined));
}

export type DriverTripFilter = 'upcoming' | 'in_progress' | 'completed';
export type DriverProfile = {
  driverId: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string;
  licenseExpiry: Date | string;
  status: string;
  rating: number;
  totalTrips: number;
};

async function withDriverTransaction<T>(operation: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function oracleDriverExists(driverId: number): Promise<boolean> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<{ DRIVER_ID: number }>(
      'SELECT driver_id FROM drivers WHERE driver_id = :driverId',
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Boolean(result.rows?.length);
  } finally { await connection.close(); }
}

export async function oracleDriverSummary(driverId: number): Promise<Record<string, unknown> | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT d.driver_id, d.first_name, d.last_name, d.status, d.license_expiry_date,
              d.total_trips,
              (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.driver_id
                AND t.departure_time >= TRUNC(SYSDATE) AND t.departure_time < TRUNC(SYSDATE) + 1) AS today_trips,
              (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.driver_id
                AND t.status = 'scheduled' AND t.departure_time > SYSTIMESTAMP) AS upcoming_trips,
              (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.driver_id AND t.status = 'completed') AS completed_trips,
              (SELECT AVG(f.rating) FROM feedback f WHERE f.driver_id = d.driver_id) AS average_rating,
              (SELECT COUNT(*) FROM feedback f WHERE f.driver_id = d.driver_id) AS rating_count
         FROM drivers d WHERE d.driver_id = :driverId`,
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    return row ? {
      driverId: Number(row.DRIVER_ID), firstName: row.FIRST_NAME, lastName: row.LAST_NAME,
      status: row.STATUS, licenseExpiry: row.LICENSE_EXPIRY_DATE, totalTrips: Number(row.TOTAL_TRIPS ?? 0),
      todayTrips: Number(row.TODAY_TRIPS ?? 0), upcomingTrips: Number(row.UPCOMING_TRIPS ?? 0),
      completedTrips: Number(row.COMPLETED_TRIPS ?? 0), averageRating: row.AVERAGE_RATING === null ? null : Number(row.AVERAGE_RATING),
      ratingCount: Number(row.RATING_COUNT ?? 0),
    } : null;
  } finally { await connection.close(); }
}

export async function oracleDriverTrips(driverId: number, filter: DriverTripFilter): Promise<Record<string, unknown>[]> {
  const filterCondition = filter === 'upcoming'
    ? "t.status = 'scheduled' AND t.departure_time > SYSTIMESTAMP"
    : filter === 'in_progress' ? "t.status = 'in_progress'" : "t.status = 'completed'";
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT t.trip_id, t.route_id, r.route_code, r.origin, r.destination,
              t.departure_time, t.arrival_time, t.status, t.available_seats, t.total_seats,
              v.vehicle_id, v.registration_number AS vehicle_registration,
              (t.total_seats - t.available_seats) AS seats_booked,
              CASE WHEN t.status = 'scheduled'
                         AND t.departure_time <= SYSTIMESTAMP + INTERVAL '30' MINUTE
                         AND NOT EXISTS (SELECT 1 FROM trips active_trip
                                          WHERE active_trip.driver_id = t.driver_id
                                            AND active_trip.trip_id <> t.trip_id
                                            AND active_trip.status = 'in_progress')
                   THEN 1 ELSE 0 END AS can_start,
              CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END AS can_complete
         FROM trips t JOIN routes r ON r.route_id = t.route_id
         JOIN vehicles v ON v.vehicle_id = t.vehicle_id
        WHERE t.driver_id = :driverId AND ${filterCondition}
        ORDER BY t.departure_time`,
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return (result.rows ?? []).map((row) => ({
      tripId: Number(row.TRIP_ID), routeId: Number(row.ROUTE_ID), routeCode: row.ROUTE_CODE,
      origin: row.ORIGIN, destination: row.DESTINATION, departureTime: row.DEPARTURE_TIME,
      arrivalTime: row.ARRIVAL_TIME, status: row.STATUS, availableSeats: Number(row.AVAILABLE_SEATS),
      totalSeats: Number(row.TOTAL_SEATS), vehicleId: Number(row.VEHICLE_ID), vehicleRegistration: row.VEHICLE_REGISTRATION,
      seatsBooked: Number(row.SEATS_BOOKED), canStart: Number(row.CAN_START) === 1, canComplete: Number(row.CAN_COMPLETE) === 1,
    }));
  } finally { await connection.close(); }
}

export async function oracleDriverManifest(driverId: number, tripId: number): Promise<Record<string, unknown>[] | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const ownedTrip = await connection.execute<{ TRIP_ID: number }>(
      'SELECT trip_id FROM trips WHERE trip_id = :tripId AND driver_id = :driverId',
      { tripId, driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    if (!ownedTrip.rows?.length) return null;
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT b.booking_id, b.passenger_id, p.first_name, p.last_name, p.phone, b.seat_number,
              b.status AS booking_status,
              NVL((SELECT status FROM (
                SELECT py.status FROM payments py WHERE py.booking_id = b.booking_id
                ORDER BY py.payment_date DESC, py.payment_id DESC
              ) WHERE ROWNUM = 1), 'unpaid') AS payment_status
         FROM bookings b JOIN passengers p ON p.passenger_id = b.passenger_id
        WHERE b.trip_id = :tripId
        ORDER BY b.seat_number`,
      { tripId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return (result.rows ?? []).map((row) => ({
      bookingId: Number(row.BOOKING_ID), passengerId: Number(row.PASSENGER_ID),
      passengerName: `${String(row.FIRST_NAME)} ${String(row.LAST_NAME)}`, phone: row.PHONE,
      seatNumber: row.SEAT_NUMBER, bookingStatus: row.BOOKING_STATUS, paymentStatus: row.PAYMENT_STATUS,
    }));
  } finally { await connection.close(); }
}

export async function oracleDriverVehicle(driverId: number): Promise<Record<string, unknown> | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT vehicle_id, registration_number, make, model, vehicle_type, seating_capacity,
              fuel_type, status, next_maintenance_date
         FROM (
           SELECT v.vehicle_id, v.registration_number, v.make, v.model, v.vehicle_type,
                  v.seating_capacity, v.fuel_type, v.status, v.next_maintenance_date,
                  ROW_NUMBER() OVER (ORDER BY CASE t.status WHEN 'in_progress' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END,
                                     CASE WHEN t.status = 'scheduled' THEN t.departure_time END,
                                     t.departure_time DESC) AS row_num
             FROM trips t JOIN vehicles v ON v.vehicle_id = t.vehicle_id
            WHERE t.driver_id = :driverId
         ) WHERE row_num = 1`,
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    return row ? {
      vehicleId: Number(row.VEHICLE_ID), registrationNumber: row.REGISTRATION_NUMBER,
      make: row.MAKE, model: row.MODEL, vehicleType: row.VEHICLE_TYPE,
      seatingCapacity: Number(row.SEATING_CAPACITY), fuelType: row.FUEL_TYPE,
      status: row.STATUS, nextMaintenanceDate: row.NEXT_MAINTENANCE_DATE,
    } : null;
  } finally { await connection.close(); }
}

export async function oracleDriverFeedback(driverId: number): Promise<Record<string, unknown>> {
  const connection = await (await getPool()).getConnection();
  try {
    const summary = await connection.execute<Record<string, unknown>>(
      'SELECT AVG(rating) AS average_rating, COUNT(*) AS rating_count FROM feedback WHERE driver_id = :driverId',
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const recent = await connection.execute<Record<string, unknown>>(
      `SELECT feedback_id, trip_id, rating, feedback_comment, feedback_date
         FROM (SELECT feedback_id, trip_id, rating, feedback_comment, feedback_date
                 FROM feedback WHERE driver_id = :driverId ORDER BY feedback_date DESC, feedback_id DESC)
        WHERE ROWNUM <= 10`,
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = summary.rows?.[0];
    return {
      averageRating: row?.AVERAGE_RATING === null || row?.AVERAGE_RATING === undefined ? null : Number(row.AVERAGE_RATING),
      ratingCount: Number(row?.RATING_COUNT ?? 0),
      recentComments: (recent.rows ?? []).map((item) => ({
        feedbackId: Number(item.FEEDBACK_ID), tripId: Number(item.TRIP_ID), rating: Number(item.RATING),
        comment: item.FEEDBACK_COMMENT, feedbackDate: item.FEEDBACK_DATE,
      })),
    };
  } finally { await connection.close(); }
}

export async function oracleDriverProfile(driverId: number): Promise<DriverProfile | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      `SELECT driver_id, first_name, last_name, phone, email, license_number, license_expiry_date, status, rating, total_trips
         FROM drivers WHERE driver_id = :driverId`,
      { driverId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    return row ? {
      driverId: Number(row.DRIVER_ID), firstName: String(row.FIRST_NAME), lastName: String(row.LAST_NAME),
      phone: row.PHONE === null ? null : String(row.PHONE), email: row.EMAIL === null ? null : String(row.EMAIL),
      licenseNumber: String(row.LICENSE_NUMBER), licenseExpiry: row.LICENSE_EXPIRY_DATE as Date,
      status: String(row.STATUS), rating: Number(row.RATING ?? 0), totalTrips: Number(row.TOTAL_TRIPS ?? 0),
    } : null;
  } finally { await connection.close(); }
}

export async function oracleDriverStartTrip(driverId: number, tripId: number): Promise<void> {
  await withDriverTransaction((connection) => connection.execute(
    'BEGIN driver_start_trip(:driverId, :tripId); END;', { driverId, tripId },
  ).then(() => undefined));
}

export async function oracleDriverCompleteTrip(driverId: number, tripId: number): Promise<void> {
  await withDriverTransaction((connection) => connection.execute(
    'BEGIN driver_complete_trip(:driverId, :tripId); END;', { driverId, tripId },
  ).then(() => undefined));
}

export async function oracleDriverUpdateProfile(driverId: number, phone: string | null, email: string | null): Promise<void> {
  await withDriverTransaction((connection) => connection.execute(
    'BEGIN driver_update_profile(:driverId, :phone, :email); END;', { driverId, phone, email },
  ).then(() => undefined));
}

export async function oracleCreate(resource: Resource, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const connection = await (await getPool()).getConnection();
  try {
    let statement: string;
    let binds: Record<string, unknown>;
    switch (resource) {
      case 'vehicles':
        statement = `INSERT INTO VEHICLES (vehicle_id, registration_number, make, model, year_of_manufacture, vehicle_type, seating_capacity, fuel_type, status, last_maintenance_date, next_maintenance_date)
          VALUES (SEQ_VEHICLES_ID.NEXTVAL, :registrationNumber, :make, :model, :year, :type, :capacity, :fuelType, :status, :lastMaintenanceDate, :nextMaintenanceDate)
          RETURNING vehicle_id INTO :generatedId`;
        binds = {
          registrationNumber: input.registrationNumber, make: input.make, model: input.model,
          year: integerInRange(input.year ?? input.yearOfManufacture, 'year', 1000, 9999),
          type: input.type ?? input.vehicleType ?? 'bus',
          capacity: integerInRange(input.capacity ?? input.seatingCapacity, 'capacity', 1, 999),
          fuelType: input.fuelType ?? 'diesel', status: input.status ?? 'active',
          lastMaintenanceDate: optionalDate(input.lastMaintenanceDate), nextMaintenanceDate: optionalDate(input.nextMaintenanceDate),
        };
        break;
      case 'drivers':
        statement = `INSERT INTO DRIVERS (driver_id, first_name, last_name, license_number, license_expiry_date, phone, email, status, joined_date, total_trips, rating)
          VALUES (SEQ_DRIVERS_ID.NEXTVAL, :firstName, :lastName, :licenseNumber, :licenseExpiry, :phone, :email, :status, :joinedDate, :totalTrips, :rating)
          RETURNING driver_id INTO :generatedId`;
        binds = {
          firstName: input.firstName, lastName: input.lastName, licenseNumber: input.licenseNumber,
          licenseExpiry: dateValue(input.licenseExpiry ?? input.licenseExpiryDate, 'licenseExpiry'),
          phone: input.phone ?? null, email: input.email ?? null, status: input.status ?? 'available',
          joinedDate: optionalDate(input.joinedDate), totalTrips: numberValue(input.totalTrips, 'totalTrips', 0),
          rating: numberValue(input.rating, 'rating', 0),
        };
        break;
      case 'routes':
        statement = `INSERT INTO ROUTES (route_id, route_code, origin, destination, distance_km, estimated_minutes, fare_amount, is_active)
          VALUES (SEQ_ROUTES_ID.NEXTVAL, :routeCode, :origin, :destination, :distanceKm, :estimatedMinutes, :fareAmount, :isActive)
          RETURNING route_id INTO :generatedId`;
        binds = {
          routeCode: input.routeCode, origin: input.origin, destination: input.destination,
          distanceKm: numberValue(input.distanceKm, 'distanceKm'),
          estimatedMinutes: numberValue(input.estimatedMinutes, 'estimatedMinutes'),
          fareAmount: numberValue(input.fareAmount, 'fareAmount'),
          isActive: input.isActive === false || input.isActive === 0 || input.isActive === 'false' ? 0 : 1,
        };
        break;
      case 'passengers':
        statement = `INSERT INTO PASSENGERS (passenger_id, first_name, last_name, email, phone, address, nic_or_passport)
          VALUES (SEQ_PASSENGERS_ID.NEXTVAL, :firstName, :lastName, :email, :phone, :address, :passportOrNic)
          RETURNING passenger_id INTO :generatedId`;
        binds = {
          firstName: input.firstName, lastName: input.lastName, email: input.email,
          phone: input.phone ?? null, address: input.address ?? null,
          passportOrNic: input.passportOrNic ?? input.nicOrPassport,
        };
        break;
      case 'trips':
        statement = `INSERT INTO TRIPS (trip_id, route_id, vehicle_id, driver_id, departure_time, arrival_time, status, available_seats, total_seats)
          VALUES (SEQ_TRIPS_ID.NEXTVAL, :routeId, :vehicleId, :driverId, :departureTime, :arrivalTime, :status, :availableSeats, :totalSeats)
          RETURNING trip_id INTO :generatedId`;
        binds = {
          routeId: numberValue(input.routeId, 'routeId'), vehicleId: numberValue(input.vehicleId, 'vehicleId'),
          driverId: numberValue(input.driverId, 'driverId'), departureTime: dateValue(input.departureTime, 'departureTime'),
          arrivalTime: dateValue(input.arrivalTime, 'arrivalTime'), status: input.status ?? 'scheduled',
          availableSeats: numberValue(input.availableSeats, 'availableSeats'), totalSeats: numberValue(input.totalSeats, 'totalSeats'),
        };
        break;
      case 'bookings':
        statement = `INSERT INTO BOOKINGS (booking_id, trip_id, passenger_id, seat_number, booking_date, status, amount)
          VALUES (SEQ_BOOKINGS_ID.NEXTVAL, :tripId, :passengerId, :seatNumber, NVL(:bookingDate, SYSDATE), :status, :amount)
          RETURNING booking_id INTO :generatedId`;
        binds = {
          tripId: numberValue(input.tripId, 'tripId'), passengerId: numberValue(input.passengerId, 'passengerId'),
          seatNumber: input.seatNumber, bookingDate: optionalDate(input.bookingDate),
          status: input.status ?? 'confirmed', amount: numberValue(input.amount, 'amount'),
        };
        break;
      case 'payments':
        statement = `INSERT INTO PAYMENTS (payment_id, booking_id, amount, payment_date, payment_method, status, transaction_ref)
          VALUES (SEQ_PAYMENTS_ID.NEXTVAL, :bookingId, :amount, NVL(:paymentDate, SYSDATE), :method, :status, :transactionRef)
          RETURNING payment_id INTO :generatedId`;
        binds = {
          bookingId: numberValue(input.bookingId, 'bookingId'), amount: numberValue(input.amount, 'amount'),
          paymentDate: optionalDate(input.paymentDate),
          method: input.method ?? input.paymentMethod ?? null, status: input.status ?? 'pending',
          transactionRef: input.transactionRef ?? null,
        };
        break;
      case 'maintenance':
        statement = `INSERT INTO MAINTENANCE_RECORDS (maintenance_id, vehicle_id, maintenance_type, description, scheduled_date, completed_date, cost, status, technician_name)
          VALUES (SEQ_MAINTENANCE_ID.NEXTVAL, :vehicleId, :maintenanceType, :description, :scheduledDate, :completedDate, :cost, :status, :technicianName)
          RETURNING maintenance_id INTO :generatedId`;
        binds = {
          vehicleId: numberValue(input.vehicleId, 'vehicleId'), maintenanceType: input.maintenanceType ?? null,
          description: input.description, scheduledDate: dateValue(input.scheduledDate, 'scheduledDate'),
          completedDate: optionalDate(input.completedDate), cost: numberValue(input.cost, 'cost', 0),
          status: input.status ?? 'scheduled', technicianName: input.technicianName ?? null,
        };
        break;
      case 'feedback':
        statement = `INSERT INTO FEEDBACK (feedback_id, passenger_id, trip_id, driver_id, vehicle_id, rating, feedback_comment, feedback_date, category)
          VALUES (SEQ_FEEDBACK_ID.NEXTVAL, :passengerId, :tripId, :driverId, :vehicleId, :rating, :comment, NVL(:feedbackDate, SYSDATE), :category)
          RETURNING feedback_id INTO :generatedId`;
        binds = {
          passengerId: numberValue(input.passengerId, 'passengerId'), tripId: numberValue(input.tripId, 'tripId'),
          driverId: numberValue(input.driverId, 'driverId'), vehicleId: numberValue(input.vehicleId, 'vehicleId'),
          rating: numberValue(input.rating, 'rating'), comment: input.comment ?? input.feedbackComment ?? null,
          feedbackDate: optionalDate(input.feedbackDate),
          category: input.category ?? 'general',
        };
        break;
    }

    const insertResult = await connection.execute<{ generatedId: number[] }>(statement, {
      ...binds,
      generatedId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    });
    const outBinds = insertResult.outBinds as { generatedId: number[] };
    const id = Number(outBinds.generatedId[0]);

    if (resource === 'routes') {
      const stops = routeStops(input.stops);
      for (const [index, stopName] of stops.entries()) {
        await connection.execute(
          `INSERT INTO ROUTE_STOPS (stop_id, route_id, stop_name, stop_order)
           VALUES (SEQ_STOPS_ID.NEXTVAL, :routeId, :stopName, :stopOrder)`,
          { routeId: id, stopName, stopOrder: index + 1 },
        );
      }
    }

    const result = await connection.execute<Record<string, unknown>>(
      `SELECT * FROM ${tableMap[resource]} WHERE ${primaryKeyMap[resource]} = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows?.[0];
    if (!row) throw new Error(`${tableMap[resource]} record was inserted but could not be read back`);
    const record = mapRow(resource, row);
    if (resource === 'routes') record.stops = routeStops(input.stops);
    await connection.commit();
    return record;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function oracleUpdate(resource: Resource, id: number, input: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const connection = await (await getPool()).getConnection();
  try {
    let statement: string;
    let binds: Record<string, unknown>;
    switch (resource) {
      case 'vehicles':
        statement = `UPDATE VEHICLES SET registration_number = :registrationNumber, make = :make, model = :model,
          year_of_manufacture = :year, vehicle_type = :type, seating_capacity = :capacity, fuel_type = :fuelType,
          status = :status, last_maintenance_date = :lastMaintenanceDate, next_maintenance_date = :nextMaintenanceDate
          WHERE vehicle_id = :id`;
        binds = { registrationNumber: input.registrationNumber, make: input.make, model: input.model,
          year: integerInRange(input.year ?? input.yearOfManufacture, 'year', 1000, 9999),
          type: input.type ?? input.vehicleType ?? 'bus', capacity: integerInRange(input.capacity ?? input.seatingCapacity, 'capacity', 1, 999),
          fuelType: input.fuelType ?? 'diesel', status: input.status ?? 'active',
          lastMaintenanceDate: optionalDate(input.lastMaintenanceDate), nextMaintenanceDate: optionalDate(input.nextMaintenanceDate), id };
        break;
      case 'drivers':
        statement = `UPDATE DRIVERS SET first_name = :firstName, last_name = :lastName, license_number = :licenseNumber,
          license_expiry_date = :licenseExpiry, phone = :phone, email = :email, status = :status, joined_date = :joinedDate,
          total_trips = :totalTrips, rating = :rating WHERE driver_id = :id`;
        binds = { firstName: input.firstName, lastName: input.lastName, licenseNumber: input.licenseNumber,
          licenseExpiry: dateValue(input.licenseExpiry ?? input.licenseExpiryDate, 'licenseExpiry'),
          phone: input.phone ?? null, email: input.email ?? null, status: input.status ?? 'available',
          joinedDate: optionalDate(input.joinedDate), totalTrips: numberValue(input.totalTrips, 'totalTrips', 0),
          rating: numberValue(input.rating, 'rating', 0), id };
        break;
      case 'routes':
        statement = `UPDATE ROUTES SET route_code = :routeCode, origin = :origin, destination = :destination,
          distance_km = :distanceKm, estimated_minutes = :estimatedMinutes, fare_amount = :fareAmount, is_active = :isActive
          WHERE route_id = :id`;
        binds = { routeCode: input.routeCode, origin: input.origin, destination: input.destination,
          distanceKm: numberValue(input.distanceKm, 'distanceKm'), estimatedMinutes: numberValue(input.estimatedMinutes, 'estimatedMinutes'),
          fareAmount: numberValue(input.fareAmount, 'fareAmount'),
          isActive: input.isActive === false || input.isActive === 0 || input.isActive === 'false' ? 0 : 1, id };
        break;
      case 'passengers':
        statement = `UPDATE PASSENGERS SET first_name = :firstName, last_name = :lastName, email = :email,
          phone = :phone, address = :address, nic_or_passport = :passportOrNic WHERE passenger_id = :id`;
        binds = { firstName: input.firstName, lastName: input.lastName, email: input.email,
          phone: input.phone ?? null, address: input.address ?? null, passportOrNic: input.passportOrNic ?? input.nicOrPassport, id };
        break;
      case 'trips':
        statement = `UPDATE TRIPS SET route_id = :routeId, vehicle_id = :vehicleId, driver_id = :driverId,
          departure_time = :departureTime, arrival_time = :arrivalTime, status = :status,
          available_seats = :availableSeats, total_seats = :totalSeats WHERE trip_id = :id`;
        binds = { routeId: numberValue(input.routeId, 'routeId'), vehicleId: numberValue(input.vehicleId, 'vehicleId'),
          driverId: numberValue(input.driverId, 'driverId'), departureTime: dateValue(input.departureTime, 'departureTime'),
          arrivalTime: dateValue(input.arrivalTime, 'arrivalTime'), status: input.status ?? 'scheduled',
          availableSeats: numberValue(input.availableSeats, 'availableSeats'), totalSeats: numberValue(input.totalSeats, 'totalSeats'), id };
        break;
      case 'bookings':
        statement = `UPDATE BOOKINGS SET trip_id = :tripId, passenger_id = :passengerId, seat_number = :seatNumber,
          booking_date = NVL(:bookingDate, SYSDATE), status = :status, amount = :amount WHERE booking_id = :id`;
        binds = { tripId: numberValue(input.tripId, 'tripId'), passengerId: numberValue(input.passengerId, 'passengerId'),
          seatNumber: input.seatNumber, bookingDate: optionalDate(input.bookingDate), status: input.status ?? 'confirmed',
          amount: numberValue(input.amount, 'amount'), id };
        break;
      case 'payments':
        statement = `UPDATE PAYMENTS SET booking_id = :bookingId, amount = :amount, payment_date = NVL(:paymentDate, SYSDATE),
          payment_method = :method, status = :status, transaction_ref = :transactionRef WHERE payment_id = :id`;
        binds = { bookingId: numberValue(input.bookingId, 'bookingId'), amount: numberValue(input.amount, 'amount'),
          paymentDate: optionalDate(input.paymentDate), method: input.method ?? input.paymentMethod ?? null,
          status: input.status ?? 'pending', transactionRef: input.transactionRef ?? null, id };
        break;
      case 'maintenance':
        statement = `UPDATE MAINTENANCE_RECORDS SET vehicle_id = :vehicleId, maintenance_type = :maintenanceType,
          description = :description, scheduled_date = :scheduledDate, completed_date = :completedDate, cost = :cost,
          status = :status, technician_name = :technicianName WHERE maintenance_id = :id`;
        binds = { vehicleId: numberValue(input.vehicleId, 'vehicleId'), maintenanceType: input.maintenanceType ?? null,
          description: input.description, scheduledDate: dateValue(input.scheduledDate, 'scheduledDate'),
          completedDate: optionalDate(input.completedDate), cost: numberValue(input.cost, 'cost', 0),
          status: input.status ?? 'scheduled', technicianName: input.technicianName ?? null, id };
        break;
      case 'feedback':
        statement = `UPDATE FEEDBACK SET passenger_id = :passengerId, trip_id = :tripId, driver_id = :driverId,
          vehicle_id = :vehicleId, rating = :rating, feedback_comment = :comment,
          feedback_date = NVL(:feedbackDate, SYSDATE), category = :category WHERE feedback_id = :id`;
        binds = { passengerId: numberValue(input.passengerId, 'passengerId'), tripId: numberValue(input.tripId, 'tripId'),
          driverId: numberValue(input.driverId, 'driverId'), vehicleId: numberValue(input.vehicleId, 'vehicleId'),
          rating: numberValue(input.rating, 'rating'), comment: input.comment ?? input.feedbackComment ?? null,
          feedbackDate: optionalDate(input.feedbackDate), category: input.category ?? 'general', id };
        break;
    }

    const result = await connection.execute(statement, binds as oracledb.BindParameters);
    if (!result.rowsAffected) {
      await connection.rollback();
      return null;
    }
    if (resource === 'routes') {
      await connection.execute('DELETE FROM ROUTE_STOPS WHERE route_id = :id', { id });
      for (const [index, stopName] of routeStops(input.stops).entries()) {
        await connection.execute(
          `INSERT INTO ROUTE_STOPS (stop_id, route_id, stop_name, stop_order)
           VALUES (SEQ_STOPS_ID.NEXTVAL, :routeId, :stopName, :stopOrder)`,
          { routeId: id, stopName, stopOrder: index + 1 },
        );
      }
    }
    const updated = await connection.execute<Record<string, unknown>>(
      `SELECT * FROM ${tableMap[resource]} WHERE ${primaryKeyMap[resource]} = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = updated.rows?.[0];
    if (!row) throw new Error(`${tableMap[resource]} record was updated but could not be read back`);
    const record = mapRow(resource, row);
    if (resource === 'routes') record.stops = routeStops(input.stops);
    await connection.commit();
    return record;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function oracleUpdateTripStatus(id: number, status: string): Promise<Record<string, unknown> | null> {
  const connection = await (await getPool()).getConnection();
  try {
    const result = await connection.execute(
      'UPDATE TRIPS SET status = :status WHERE trip_id = :id',
      { status, id },
      { autoCommit: true },
    );
    if (!result.rowsAffected) return null;
    const updated = await connection.execute<Record<string, unknown>>(
      'SELECT * FROM TRIPS WHERE trip_id = :id',
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return updated.rows?.[0] ? mapRow('trips', updated.rows[0]) : null;
  } finally {
    await connection.close();
  }
}

export async function closeOracle(): Promise<void> {
  if (pool) await pool.close(0);
  pool = undefined;
}
