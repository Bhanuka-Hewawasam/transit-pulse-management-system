import oracledb from 'oracledb';

export type DatabaseHealth = { database: 'Oracle'; connected: boolean; mode: 'oracle' | 'demo'; message: string };

const tableMap = {
  vehicles: 'VEHICLES', drivers: 'DRIVERS', routes: 'ROUTES', passengers: 'PASSENGERS',
  trips: 'TRIPS', bookings: 'BOOKINGS', payments: 'PAYMENTS', maintenance: 'MAINTENANCE_RECORDS', feedback: 'FEEDBACK',
} as const;

type Resource = keyof typeof tableMap;
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
