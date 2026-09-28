// ============================================================
// SmartMove Transport Solutions
// File: src/pages/ManagementPage.tsx
//
// Generic management page for entity administration (Vehicles,
// Drivers, Passengers, Trips, Bookings, Payments, Maintenance, Feedback).
// Features:
//  - Consistent header with title, description, and primary "Add" action
//  - Search bar & sticky-header data table with zebra rows & status badges
//  - Responsive mobile cards view with action buttons
//  - Modal form dialog with real-time field validation & loading states
//  - Floating success/error toast notifications
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, Pencil, Plus, CheckCircle2, AlertCircle, X, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiEndpoints, apiGet, apiPatch, apiPost } from '../services/api';

type RecordRow = Record<string, string | number | undefined>;
type EntityName = keyof typeof apiEndpoints;
type InputType = 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea';
type FieldSpec = {
  name: string;
  label: string;
  type: InputType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  optional?: boolean;
  defaultValue?: string;
  options?: string[];
  lookup?: EntityName;
};
type Lookups = Partial<Record<EntityName, Record<string, unknown>[]>>;

class FieldValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

const text = (value: unknown) => String(value ?? '—');
const money = (value: unknown) => `LKR ${Number(value ?? 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const displayDate = (value: unknown) => {
  if (!value) return '—';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return raw.includes('T')
    ? date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const pageMeta: Record<string, { title: string; description: string }> = {
  vehicles: { title: 'Vehicles', description: 'Fleet register and operational status.' },
  drivers: { title: 'Drivers', description: 'Driver identities, licence details, and fleet status.' },
  passengers: { title: 'Passengers', description: 'Passenger profiles and contact details.' },
  trips: { title: 'Trips', description: 'Schedule trips using routes, vehicles, and drivers from the database.' },
  bookings: { title: 'Bookings', description: 'Seat reservations linked to database trips and passengers.' },
  payments: { title: 'Payments', description: 'Payment records linked to bookings.' },
  maintenance: { title: 'Maintenance', description: 'Vehicle inspections, service work, and repairs.' },
  feedback: { title: 'Feedback', description: 'Passenger ratings and service comments.' },
};

const columnsFor: Record<string, Column<RecordRow>[]> = {
  vehicles: [
    { key: 'registration', label: 'Registration' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'capacity', label: 'Seats' },
    { key: 'fuel', label: 'Fuel' },
    { key: 'nextMaintenance', label: 'Next maintenance' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="vehicle" /> },
  ],
  drivers: [
    { key: 'name', label: 'Driver' },
    { key: 'license', label: 'Licence' },
    { key: 'expiry', label: 'Licence expiry' },
    { key: 'phone', label: 'Phone' },
    { key: 'trips', label: 'Trips' },
    { key: 'rating', label: 'Rating' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="driver" /> },
  ],
  passengers: [
    { key: 'name', label: 'Passenger' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'registered', label: 'Registered' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'identity', label: 'NIC / Passport' },
  ],
  trips: [
    { key: 'route', label: 'Route' },
    { key: 'departure', label: 'Departure' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' },
    { key: 'seats', label: 'Seats available / total' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="trip" /> },
  ],
  bookings: [
    { key: 'id', label: 'Booking' },
    { key: 'passenger', label: 'Passenger' },
    { key: 'route', label: 'Route' },
    { key: 'seat', label: 'Seat' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="booking" /> },
  ],
  payments: [
    { key: 'reference', label: 'Transaction' },
    { key: 'passenger', label: 'Passenger' },
    { key: 'route', label: 'Route' },
    { key: 'date', label: 'Date' },
    { key: 'method', label: 'Method' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="payment" /> },
  ],
  maintenance: [
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'cost', label: 'Cost' },
    { key: 'technician', label: 'Technician' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="maintenance" /> },
  ],
  feedback: [
    { key: 'passenger', label: 'Passenger' },
    { key: 'route', label: 'Route' },
    { key: 'driver', label: 'Driver' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'rating', label: 'Rating' },
    { key: 'category', label: 'Category' },
    { key: 'comment', label: 'Comment' },
    { key: 'date', label: 'Date' },
  ],
};

const selectOptions: Record<string, string[]> = {
  type: ['bus', 'van', 'minibus'],
  fuelType: ['diesel', 'petrol', 'electric'],
  vehicleStatus: ['active', 'maintenance', 'inactive'],
  driverStatus: ['available', 'on_trip', 'off_duty', 'suspended'],
  tripStatus: ['scheduled', 'in_progress', 'completed', 'cancelled'],
  bookingStatus: ['confirmed', 'cancelled', 'pending', 'completed'],
  paymentMethod: ['card', 'cash', 'online', 'bank_transfer'],
  paymentStatus: ['paid', 'pending', 'failed', 'refunded'],
  maintenanceType: ['routine', 'repair', 'inspection', 'emergency'],
  maintenanceStatus: ['scheduled', 'in_progress', 'completed', 'overdue'],
  feedbackCategory: ['service', 'driver', 'vehicle', 'punctuality', 'general'],
};

const forms: Record<string, FieldSpec[]> = {
  vehicles: [
    { name: 'registrationNumber', label: 'Registration number', type: 'text', required: true },
    { name: 'make', label: 'Make', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true, min: 1000, max: 9999, step: 1 },
    { name: 'type', label: 'Vehicle type', type: 'select', defaultValue: 'bus', options: selectOptions.type },
    { name: 'capacity', label: 'Seating capacity', type: 'number', required: true, min: 1, max: 999, step: 1 },
    { name: 'fuelType', label: 'Fuel type', type: 'select', defaultValue: 'diesel', options: selectOptions.fuelType },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'active', options: selectOptions.vehicleStatus },
    { name: 'lastMaintenanceDate', label: 'Last maintenance date', type: 'date', optional: true },
    { name: 'nextMaintenanceDate', label: 'Next maintenance date', type: 'date', optional: true },
  ],
  drivers: [
    { name: 'firstName', label: 'First name', type: 'text', required: true },
    { name: 'lastName', label: 'Last name', type: 'text', required: true },
    { name: 'licenseNumber', label: 'Licence number', type: 'text', required: true },
    { name: 'licenseExpiry', label: 'Licence expiry', type: 'date', required: true },
    { name: 'phone', label: 'Phone', type: 'text', optional: true },
    { name: 'email', label: 'Email', type: 'email', optional: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'available', options: selectOptions.driverStatus },
    { name: 'joinedDate', label: 'Joined date', type: 'date', optional: true },
    { name: 'totalTrips', label: 'Total trips', type: 'number', optional: true, min: 0, step: 1 },
    { name: 'rating', label: 'Rating', type: 'number', optional: true, min: 0, max: 5, step: 0.01 },
  ],
  passengers: [
    { name: 'firstName', label: 'First name', type: 'text', required: true },
    { name: 'lastName', label: 'Last name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', optional: true },
    { name: 'address', label: 'Address', type: 'text', optional: true },
    { name: 'passportOrNic', label: 'Passport or NIC', type: 'text', required: true },
  ],
  trips: [
    { name: 'routeId', label: 'Route', type: 'select', lookup: 'routes', required: true },
    { name: 'vehicleId', label: 'Vehicle', type: 'select', lookup: 'vehicles', required: true },
    { name: 'driverId', label: 'Driver', type: 'select', lookup: 'drivers', required: true },
    { name: 'departureTime', label: 'Departure time', type: 'datetime-local', required: true },
    { name: 'arrivalTime', label: 'Arrival time', type: 'datetime-local', required: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'scheduled', options: selectOptions.tripStatus },
    { name: 'totalSeats', label: 'Total seats', type: 'number', required: true, min: 1, step: 1 },
    { name: 'availableSeats', label: 'Available seats', type: 'number', required: true, min: 0, step: 1 },
  ],
  bookings: [
    { name: 'tripId', label: 'Trip', type: 'select', lookup: 'trips', required: true },
    { name: 'passengerId', label: 'Passenger', type: 'select', lookup: 'passengers', required: true },
    { name: 'seatNumber', label: 'Seat number', type: 'text', required: true },
    { name: 'bookingDate', label: 'Booking date', type: 'date', optional: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'confirmed', options: selectOptions.bookingStatus },
    { name: 'amount', label: 'Amount (LKR)', type: 'number', required: true, min: 0, step: 0.01 },
  ],
  payments: [
    { name: 'bookingId', label: 'Booking', type: 'select', lookup: 'bookings', required: true },
    { name: 'amount', label: 'Amount (LKR)', type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'paymentDate', label: 'Payment date', type: 'date', optional: true },
    { name: 'method', label: 'Payment method', type: 'select', defaultValue: 'card', options: selectOptions.paymentMethod },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: selectOptions.paymentStatus },
    { name: 'transactionRef', label: 'Transaction reference', type: 'text', optional: true },
  ],
  maintenance: [
    { name: 'vehicleId', label: 'Vehicle', type: 'select', lookup: 'vehicles', required: true },
    { name: 'maintenanceType', label: 'Maintenance type', type: 'select', defaultValue: 'routine', options: selectOptions.maintenanceType },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'scheduledDate', label: 'Scheduled date', type: 'date', required: true },
    { name: 'completedDate', label: 'Completed date', type: 'date', optional: true },
    { name: 'cost', label: 'Cost (LKR)', type: 'number', optional: true, min: 0, step: 0.01 },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'scheduled', options: selectOptions.maintenanceStatus },
    { name: 'technicianName', label: 'Technician name', type: 'text', optional: true },
  ],
  feedback: [
    { name: 'passengerId', label: 'Passenger', type: 'select', lookup: 'passengers', required: true },
    { name: 'tripId', label: 'Trip', type: 'select', lookup: 'trips', required: true },
    { name: 'driverId', label: 'Driver', type: 'select', lookup: 'drivers', required: true },
    { name: 'vehicleId', label: 'Vehicle', type: 'select', lookup: 'vehicles', required: true },
    { name: 'rating', label: 'Rating (1–5)', type: 'number', required: true, min: 1, max: 5, step: 1 },
    { name: 'comment', label: 'Comment', type: 'textarea', required: true },
    { name: 'feedbackDate', label: 'Feedback date', type: 'date', optional: true },
    { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: selectOptions.feedbackCategory },
  ],
};

const lookupResources: Record<string, EntityName[]> = {
  trips: ['routes', 'vehicles', 'drivers'],
  bookings: ['trips', 'passengers', 'routes'],
  payments: ['bookings', 'trips', 'passengers', 'routes'],
  maintenance: ['vehicles'],
  feedback: ['passengers', 'trips', 'routes', 'drivers', 'vehicles'],
};

const fullName = (record?: Record<string, unknown>) => record ? `${text(record.firstName)} ${text(record.lastName)}` : '—';
const findRecord = (items: Record<string, unknown>[] | undefined, id: unknown) => items?.find((item) => Number(item.id) === Number(id));
const routeLabel = (route?: Record<string, unknown>) => route ? `${text(route.routeCode)} · ${text(route.origin)} to ${text(route.destination)}` : '—';
const tripLabel = (trip: Record<string, unknown> | undefined, lookups: Lookups) => {
  if (!trip) return '—';
  const route = findRecord(lookups.routes, trip.routeId);
  return `${routeLabel(route)} · ${displayDate(trip.departureTime)}`;
};

function toRows(page: string, records: Record<string, unknown>[], lookups: Lookups): RecordRow[] {
  return records.map((record) => {
    const id = Number(record.id);
    if (page === 'vehicles') return { id, registration: text(record.registrationNumber), vehicle: `${text(record.make)} ${text(record.model)}`, type: text(record.type), capacity: Number(record.capacity), fuel: text(record.fuelType), status: text(record.status), nextMaintenance: displayDate(record.nextMaintenanceDate) };
    if (page === 'drivers') return { id, name: fullName(record), license: text(record.licenseNumber), expiry: displayDate(record.licenseExpiry), phone: text(record.phone), trips: Number(record.totalTrips ?? 0), rating: Number(record.rating ?? 0).toFixed(2), status: text(record.status) };
    if (page === 'passengers') return { id, name: fullName(record), email: text(record.email), phone: text(record.phone), registered: displayDate(record.registeredDate), bookings: Number(record.totalBookings ?? 0), identity: text(record.passportOrNic) };
    if (page === 'trips') return { id, route: routeLabel(findRecord(lookups.routes, record.routeId)), departure: displayDate(record.departureTime), vehicle: text(findRecord(lookups.vehicles, record.vehicleId)?.registrationNumber), driver: fullName(findRecord(lookups.drivers, record.driverId)), seats: `${text(record.availableSeats)}/${text(record.totalSeats)}`, status: text(record.status) };
    if (page === 'bookings') {
      const trip = findRecord(lookups.trips, record.tripId);
      return { id, passenger: fullName(findRecord(lookups.passengers, record.passengerId)), route: tripLabel(trip, lookups), seat: text(record.seatNumber), date: displayDate(record.bookingDate), amount: money(record.amount), status: text(record.status) };
    }
    if (page === 'payments') {
      const booking = findRecord(lookups.bookings, record.bookingId);
      const trip = findRecord(lookups.trips, booking?.tripId);
      return { id, reference: text(record.transactionRef), passenger: fullName(findRecord(lookups.passengers, booking?.passengerId)), route: tripLabel(trip, lookups), date: displayDate(record.paymentDate), method: text(record.method), amount: money(record.amount), status: text(record.status) };
    }
    if (page === 'maintenance') return { id, vehicle: text(findRecord(lookups.vehicles, record.vehicleId)?.registrationNumber), type: text(record.maintenanceType), description: text(record.description), scheduled: displayDate(record.scheduledDate), cost: money(record.cost), technician: text(record.technicianName), status: text(record.status) };
    const trip = findRecord(lookups.trips, record.tripId);
    return { id, passenger: fullName(findRecord(lookups.passengers, record.passengerId)), route: tripLabel(trip, lookups), driver: fullName(findRecord(lookups.drivers, record.driverId)), vehicle: text(findRecord(lookups.vehicles, record.vehicleId)?.registrationNumber), rating: `${text(record.rating)}/5`, category: text(record.category), comment: text(record.comment), date: displayDate(record.feedbackDate) };
  });
}

async function loadPage(page: string) {
  const endpoint = apiEndpoints[page as EntityName];
  if (!endpoint) throw new Error('This module is not connected to a backend endpoint.');
  const related = lookupResources[page] ?? [];
  const [records, ...referenceRows] = await Promise.all([
    apiGet<Record<string, unknown>[]>(endpoint),
    ...related.map((resource) => apiGet<Record<string, unknown>[]>(apiEndpoints[resource])),
  ]);
  const lookups: Lookups = Object.fromEntries(related.map((resource, index) => [resource, referenceRows[index]]));
  return { records, rows: toRows(page, records, lookups), lookups };
}

function fieldValue(field: FieldSpec, value: unknown): string {
  if (value === undefined || value === null) return '';
  const raw = String(value);
  if (field.type === 'date') return raw.slice(0, 10);
  if (field.type === 'datetime-local') {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  }
  return raw;
}

function makePayload(page: string, form: Record<string, string>): Record<string, unknown> {
  const specs = forms[page] ?? [];
  const payload: Record<string, unknown> = {};
  for (const field of specs) {
    const raw = form[field.name] ?? field.defaultValue ?? '';
    if (!raw.trim()) {
      if (field.required) throw new FieldValidationError(field.name, `${field.label} is required.`);
      if (field.type === 'date' && field.optional) payload[field.name] = null;
      continue;
    }
    if (field.type === 'number' || field.lookup) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) throw new FieldValidationError(field.name, `${field.label} must be a valid number.`);
      if (field.step === 1 && !Number.isInteger(parsed)) throw new FieldValidationError(field.name, `${field.label} must be a whole number.`);
      if (field.min !== undefined && field.max !== undefined && (parsed < field.min || parsed > field.max)) {
        throw new FieldValidationError(field.name, `${field.label} must be between ${field.min} and ${field.max}.`);
      }
      if (field.min !== undefined && parsed < field.min) throw new FieldValidationError(field.name, `${field.label} must be at least ${field.min}.`);
      if (field.max !== undefined && parsed > field.max) throw new FieldValidationError(field.name, `${field.label} must be no more than ${field.max}.`);
      payload[field.name] = parsed;
    } else if (field.type === 'date' || field.type === 'datetime-local') {
      if (Number.isNaN(new Date(raw).getTime())) throw new FieldValidationError(field.name, `${field.label} must be a valid date.`);
      payload[field.name] = raw;
    } else if (field.type === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new FieldValidationError(field.name, `${field.label} must be a valid email address.`);
      payload[field.name] = raw.trim();
    } else {
      payload[field.name] = raw.trim();
    }
  }
  if (page === 'trips' && Number(payload.availableSeats) > Number(payload.totalSeats)) {
    throw new FieldValidationError('availableSeats', 'Available seats cannot exceed total seats.');
  }
  return payload;
}

const ManagementPage: React.FC<{ page: string; searchValue?: string; onSearchValueChange?: (value: string) => void }> = ({ page, searchValue, onSearchValueChange }) => {
  const meta = pageMeta[page];
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [rawRecords, setRawRecords] = useState<Record<string, unknown>[]>([]);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [lookups, setLookups] = useState<Lookups>({});
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [formError, setFormError] = useState<ApiError | Error | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const specs = forms[page] ?? [];
  const search = searchValue ?? localSearch;
  const changeSearch = onSearchValueChange ?? setLocalSearch;

  const recordLabel = ({
    vehicles: 'Vehicle', drivers: 'Driver', passengers: 'Passenger', trips: 'Trip', bookings: 'Booking',
    payments: 'Payment', maintenance: 'Maintenance record', feedback: 'Feedback',
  } as Record<string, string>)[page] ?? meta?.title.slice(0, -1) ?? 'Record';

  useEffect(() => {
    let active = true;
    loadPage(page).then((result) => {
      if (!active) return;
      setRecords(result.rows);
      setRawRecords(result.records);
      setLookups(result.lookups);
    }).catch((loadError: Error) => {
      if (active) setError(loadError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page]);

  const editRecord = (id: number) => {
    const selected = rawRecords.find((record) => Number(record.id) === id);
    if (!selected) return;
    setEditingRecord(selected);
    setForm(Object.fromEntries(specs.map((field) => [field.name, fieldValue(field, selected[field.name])])));
    setFieldErrors({});
    setFormError(null);
    setSuccess('');
    setFormOpen(true);
  };

  const addRecord = () => {
    setEditingRecord(null);
    setForm({});
    setFieldErrors({});
    setFormError(null);
    setSuccess('');
    setFormOpen(true);
  };

  const createRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccess('');
    let payload: Record<string, unknown>;
    try {
      payload = makePayload(page, form);
    } catch (validationError) {
      if (validationError instanceof FieldValidationError) {
        setFieldErrors({ [validationError.field]: validationError.message });
        setFormError(new Error('Correct the highlighted field before saving.'));
      } else {
        setFormError(validationError instanceof Error ? validationError : new Error('Check the entered values.'));
      }
      return;
    }

    setSaving(true);
    try {
      if (editingRecord) {
        await apiPatch(`${apiEndpoints[page as EntityName]}/${editingRecord.id}`, payload);
      } else {
        await apiPost(apiEndpoints[page as EntityName], payload);
      }
      setForm({});
      setEditingRecord(null);
      setFieldErrors({});
      setFormOpen(false);
      setSuccess(`${recordLabel} ${editingRecord ? 'updated' : 'saved'} to the backend.`);
      try {
        const refreshed = await loadPage(page);
        setRecords(refreshed.rows);
        setRawRecords(refreshed.records);
        setLookups(refreshed.lookups);
        setError(null);
      } catch (refreshError) {
        setFormError(new Error(`The record was saved, but the list could not be refreshed: ${refreshError instanceof Error ? refreshError.message : 'Refresh failed.'}`));
      }
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError : new Error('Unable to save this record.'));
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((row) => !query || Object.values(row).some((value) => text(value).toLowerCase().includes(query)));
  }, [records, search]);

  const columns: Column<RecordRow>[] = [
    ...(columnsFor[page] ?? []),
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          type="button"
          aria-label={`Edit ${recordLabel} #${row.id}`}
          onClick={() => editRecord(Number(row.id))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 cursor-pointer"
        >
          <Pencil size={13} className="text-blue-700 shrink-0" /> Edit
        </button>
      ),
    },
  ];

  const mobileColumns = columns.filter((column) => column.key !== 'id' && column.key !== 'actions');
  const renderCell = (column: Column<RecordRow>, row: RecordRow) => column.render
    ? column.render(row)
    : String(row[String(column.key)] ?? '—');

  if (!meta) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 shadow-2xs">This module has no management page.</p>;

  return (
    <div className="space-y-6">
      {/* ── Toast Success Notification ── */}
      {success && (
        <div role="status" className="fixed right-4 top-20 z-50 flex max-w-md items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur-md transition-all sm:right-6">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Saved! </span>
              <span>{success}</span>
            </div>
          </div>
          <button type="button" aria-label="Dismiss toast" onClick={() => setSuccess('')} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Page Header Bar ── */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
            SmartMove Fleet Management
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-gray-600 font-medium">{meta.description}</p>
        </div>
        <button
          type="button"
          onClick={addRecord}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 shrink-0 cursor-pointer"
          style={{ backgroundColor: '#1a5fb4' }}
        >
          <Plus size={18} className="stroke-[2.5]" />
          Add {recordLabel}
        </button>
      </div>

      {/* ── Requirement 2: Search & Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onSearchValueChange === undefined && (
          <SearchBar
            value={search}
            onChange={changeSearch}
            placeholder={`Search ${meta.title.toLowerCase()} by key attributes…`}
            className="max-w-md"
          />
        )}
        <div className="text-xs font-medium text-gray-500">
          Showing <span className="font-bold text-gray-800">{rows.length}</span> of {records.length} records
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Unable to load {meta.title.toLowerCase()}: {error.message}</p>
              {error instanceof ApiError && (
                <details className="mt-1 text-xs font-mono text-rose-700">
                  <summary className="cursor-pointer font-sans font-medium hover:underline">Technical detail</summary>
                  <code className="block mt-1 p-2 rounded bg-rose-100/60">{error.technicalMessage}</code>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Form Modal Dialog ── */}
      <Modal
        isOpen={formOpen}
        onClose={() => { if (!saving) { setFormOpen(false); setEditingRecord(null); setFormError(null); } }}
        title={editingRecord ? `Edit ${recordLabel} #${editingRecord.id}` : `Add ${recordLabel}`}
        size="lg"
      >
        <form onSubmit={createRecord} noValidate className="space-y-5">
          <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
            <p className="text-xs font-medium text-gray-500">Fields marked <span className="text-rose-600 font-bold">*</span> are required.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((field) => {
              const value = form[field.name] ?? field.defaultValue ?? '';
              const inputClass = `w-full rounded-xl border ${fieldErrors[field.name] ? 'border-rose-400 bg-rose-50/20' : 'border-gray-300 bg-white'} px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs`;
              const options = field.lookup ? lookups[field.lookup] ?? [] : [];
              const fieldError = fieldErrors[field.name];

              const setValue = (nextValue: string) => {
                setForm((previous) => ({ ...previous, [field.name]: nextValue }));
                setFormError(null);
                setFieldErrors((previous) => {
                  const next = { ...previous };
                  delete next[field.name];
                  return next;
                });
                setSuccess('');
              };

              return (
                <label key={field.name} className={`block space-y-1.5 text-xs font-semibold text-gray-700 ${field.type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                  <span className="flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-rose-600 font-bold">*</span>}
                    {field.optional && <span className="text-gray-400 font-normal">(optional)</span>}
                  </span>
                  {field.type === 'select' ? (
                    <select
                      aria-label={field.label}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? `${field.name}-error` : undefined}
                      value={value}
                      required={field.required}
                      onChange={(event) => setValue(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">{`Select ${field.label.toLowerCase()}`}</option>
                      {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
                      {options.map((option) => (
                        <option key={String(option.id)} value={String(option.id)}>
                          {field.lookup === 'routes' ? routeLabel(option)
                            : field.lookup === 'vehicles' ? `${text(option.registrationNumber)} · ${text(option.make)} ${text(option.model)}`
                            : field.lookup === 'drivers' || field.lookup === 'passengers' ? fullName(option)
                            : field.lookup === 'trips' ? `${text(option.id)} · ${text(option.routeCode ?? option.routeId)} · ${displayDate(option.departureTime)}`
                            : field.lookup === 'bookings' ? `Booking #${text(option.id)} · ${text(option.seatNumber)}`
                            : text(option.id)}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      aria-label={field.label}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? `${field.name}-error` : undefined}
                      value={value}
                      required={field.required}
                      rows={3}
                      onChange={(event) => setValue(event.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <input
                      aria-label={field.label}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? `${field.name}-error` : undefined}
                      type={field.type}
                      value={value}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      onChange={(event) => setValue(event.target.value)}
                      className={inputClass}
                    />
                  )}
                  {fieldError && (
                    <span id={`${field.name}-error`} className="block text-xs font-semibold text-rose-600 animate-fade-in">
                      {fieldError}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {formError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <p className="font-bold">{formError.message}</p>
              {formError instanceof ApiError && (
                <details className="mt-1 font-mono">
                  <summary className="cursor-pointer font-sans font-medium hover:underline">Technical detail</summary>
                  <code>{formError.technicalMessage}</code>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => { setFormOpen(false); setEditingRecord(null); setFormError(null); }}
              disabled={saving}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: '#1a5fb4' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Requirement 2: Desktop Table & Mobile Cards ── */}
      <section aria-label={`${meta.title} records`}>
        {/* Desktop View */}
        <div className="hidden max-h-[72vh] overflow-auto md:block">
          <DataTable<RecordRow>
            columns={columns}
            data={rows}
            loading={loading}
            emptyMessage={search ? `No ${meta.title.toLowerCase()} match your search.` : 'No records exist in the connected database.'}
          />
        </div>

        {/* Requirement 2: Mobile View (Cards instead of wide table) */}
        <div className="grid max-h-[75vh] gap-3.5 overflow-y-auto md:hidden" aria-label={`${meta.title} mobile records`}>
          {loading ? (
            [0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-gray-100 border border-gray-200" />)
          ) : rows.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 shadow-2xs">
              <Inbox size={36} strokeWidth={1.25} className="text-gray-400" />
              <p className="font-semibold text-gray-700">
                {search ? `No ${meta.title.toLowerCase()} match your search on this screen.` : `No ${meta.title.toLowerCase()} to show on this screen.`}
              </p>
              <p className="text-xs text-gray-400">Try adjusting your search criteria or add a new record.</p>
            </div>
          ) : (
            rows.map((row) => (
              <article key={String(row.id)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="font-bold text-gray-900 text-sm">{recordLabel} #{row.id}</h3>
                  {columns.find((column) => column.key === 'actions')?.render?.(row)}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  {mobileColumns.map((column) => (
                    <div key={String(column.key)} className="min-w-0">
                      <dt className="font-semibold text-gray-500 uppercase text-[10px] tracking-wider">{column.label}</dt>
                      <dd className="mt-0.5 break-words font-medium text-gray-900">{renderCell(column, row)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ManagementPage;
