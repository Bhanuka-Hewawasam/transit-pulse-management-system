import {
  bookings as seedBookings,
  drivers as seedDrivers,
  feedbackRecords as seedFeedback,
  maintenanceRecords as seedMaintenance,
  passengers as seedPassengers,
  payments as seedPayments,
  routes as seedRoutes,
  trips as seedTrips,
  vehicles as seedVehicles,
} from '../../src/data/demoData.js';
import type {
  Booking, Driver, Feedback, MaintenanceRecord, Passenger, Payment, Route, Trip, Vehicle,
} from '../../src/types/index.js';

export interface Database {
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  passengers: Passenger[];
  trips: Trip[];
  bookings: Booking[];
  payments: Payment[];
  maintenance: MaintenanceRecord[];
  feedback: Feedback[];
}

export const database: Database = {
  vehicles: structuredClone(seedVehicles),
  drivers: structuredClone(seedDrivers),
  routes: structuredClone(seedRoutes),
  passengers: structuredClone(seedPassengers),
  trips: structuredClone(seedTrips),
  bookings: structuredClone(seedBookings),
  payments: structuredClone(seedPayments),
  maintenance: structuredClone(seedMaintenance),
  feedback: structuredClone(seedFeedback),
};

export function nextId<T extends { id: number }>(rows: T[]): number {
  return Math.max(0, ...rows.map((row) => row.id)) + 1;
}
