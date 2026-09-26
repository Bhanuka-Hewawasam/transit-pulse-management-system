import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import type { Column } from '../components/DataTable';
import { ApiError, apiEndpoints, apiGet, apiPost } from '../services/api';

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
  const raw = String(value);
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
    { key: 'registration', label: 'Registration' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'type', label: 'Type' },
    { key: 'capacity', label: 'Seats' }, { key: 'fuel', label: 'Fuel' }, { key: 'nextMaintenance', label: 'Next maintenance' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="vehicle" /> },
  ],
  drivers: [
    { key: 'name', label: 'Driver' }, { key: 'license', label: 'Licence' }, { key: 'expiry', label: 'Licence expiry' },
    { key: 'phone', label: 'Phone' }, { key: 'trips', label: 'Trips' }, { key: 'rating', label: 'Rating' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="driver" /> },
  ],
  passengers: [
    { key: 'name', label: 'Passenger' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
    { key: 'registered', label: 'Registered' }, { key: 'bookings', label: 'Bookings' }, { key: 'identity', label: 'NIC / Passport' },
  ],
  trips: [
    { key: 'route', label: 'Route' }, { key: 'departure', label: 'Departure' }, { key: 'vehicle', label: 'Vehicle' },
    { key: 'driver', label: 'Driver' }, { key: 'seats', label: 'Seats available / total' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="trip" /> },
  ],
  bookings: [
    { key: 'id', label: 'Booking' }, { key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' },
    { key: 'seat', label: 'Seat' }, { key: 'date', label: 'Date' }, { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="booking" /> },
  ],
  payments: [
    { key: 'reference', label: 'Transaction' }, { key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' },
    { key: 'date', label: 'Date' }, { key: 'method', label: 'Method' }, { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="payment" /> },
  ],
  maintenance: [
    { key: 'vehicle', label: 'Vehicle' }, { key: 'type', label: 'Type' }, { key: 'description', label: 'Description' },
    { key: 'scheduled', label: 'Scheduled' }, { key: 'cost', label: 'Cost' }, { key: 'technician', label: 'Technician' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={text(row.status)} type="maintenance" /> },
  ],
  feedback: [
    { key: 'passenger', label: 'Passenger' }, { key: 'route', label: 'Route' }, { key: 'driver', label: 'Driver' },
    { key: 'vehicle', label: 'Vehicle' }, { key: 'rating', label: 'Rating' }, { key: 'category', label: 'Category' },
    { key: 'comment', label: 'Comment' }, { key: 'date', label: 'Date' },
  ],
};

const selectOptions: Record<string, string[]> = {
  type: ['bus', 'van', 'minibus'], fuelType: ['diesel', 'petrol', 'electric'],
  vehicleStatus: ['active', 'maintenance', 'inactive'], driverStatus: ['available', 'on_trip', 'off_duty', 'suspended'],
  tripStatus: ['scheduled', 'in_progress', 'completed', 'cancelled'], bookingStatus: ['confirmed', 'cancelled', 'pending', 'completed'],
  paymentMethod: ['card', 'cash', 'online', 'bank_transfer'], paymentStatus: ['paid', 'pending', 'failed', 'refunded'],
  maintenanceType: ['routine', 'repair', 'inspection', 'emergency'], maintenanceStatus: ['scheduled', 'in_progress', 'completed', 'overdue'],
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
    { name: 'firstName', label: 'First name', type: 'text', required: true }, { name: 'lastName', label: 'Last name', type: 'text', required: true },
    { name: 'licenseNumber', label: 'Licence number', type: 'text', required: true }, { name: 'licenseExpiry', label: 'Licence expiry', type: 'date', required: true },
    { name: 'phone', label: 'Phone', type: 'text', optional: true }, { name: 'email', label: 'Email', type: 'email', optional: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'available', options: selectOptions.driverStatus },
    { name: 'joinedDate', label: 'Joined date', type: 'date', optional: true },
    { name: 'totalTrips', label: 'Total trips', type: 'number', optional: true, min: 0, step: 1 },
    { name: 'rating', label: 'Rating', type: 'number', optional: true, min: 0, max: 5, step: 0.01 },
  ],
  passengers: [
    { name: 'firstName', label: 'First name', type: 'text', required: true }, { name: 'lastName', label: 'Last name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'text', optional: true },
    { name: 'address', label: 'Address', type: 'text', optional: true }, { name: 'passportOrNic', label: 'Passport or NIC', type: 'text', required: true },
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
  trips: ['routes', 'vehicles', 'drivers'], bookings: ['trips', 'passengers', 'routes'],
  payments: ['bookings', 'trips', 'passengers', 'routes'], maintenance: ['vehicles'],
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
  return { rows: toRows(page, records, lookups), lookups };
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

const ManagementPage: React.FC<{ page: string }> = ({ page }) => {
  const meta = pageMeta[page];
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [lookups, setLookups] = useState<Lookups>({});
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [formError, setFormError] = useState<ApiError | Error | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const specs = forms[page] ?? [];

  useEffect(() => {
    let active = true;
    loadPage(page).then((result) => {
      if (!active) return;
      setRecords(result.rows);
      setLookups(result.lookups);
    }).catch((loadError: Error) => {
      if (active) setError(loadError);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page]);

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
      await apiPost(apiEndpoints[page as EntityName], payload);
      setForm({});
      setFieldErrors({});
      setSuccess(`${meta.title.slice(0, -1)} saved to the backend.`);
      try {
        const refreshed = await loadPage(page);
        setRecords(refreshed.rows);
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

  if (!meta) return <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">This module has no management page.</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{meta.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{meta.description}</p>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder={`Search ${meta.title.toLowerCase()}…`} className="max-w-md" />
      <form onSubmit={createRecord} noValidate className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Add {meta.title.slice(0, -1)}</h3>
          <span className="text-xs text-gray-500">Saved through the backend API</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((field) => {
            const value = form[field.name] ?? field.defaultValue ?? '';
            const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
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
              <label key={field.name} className={`block space-y-1 text-sm font-medium text-gray-700 ${field.type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                <span>{field.label}{field.required ? ' *' : field.optional ? ' (optional)' : ''}</span>
                {field.type === 'select' ? (
                  <select aria-label={field.label} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `${field.name}-error` : undefined} value={value} required={field.required} onChange={(event) => setValue(event.target.value)} className={inputClass}>
                    <option value="">{field.lookup ? `Select ${field.label.toLowerCase()}` : `Select ${field.label.toLowerCase()}`}</option>
                    {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
                    {options.map((option) => <option key={String(option.id)} value={String(option.id)}>{field.lookup === 'routes' ? routeLabel(option) : field.lookup === 'vehicles' ? `${text(option.registrationNumber)} · ${text(option.make)} ${text(option.model)}` : field.lookup === 'drivers' || field.lookup === 'passengers' ? fullName(option) : field.lookup === 'trips' ? `${text(option.id)} · ${text(option.routeCode ?? option.routeId)} · ${displayDate(option.departureTime)}` : field.lookup === 'bookings' ? `Booking #${text(option.id)} · ${text(option.seatNumber)}` : text(option.id)}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea aria-label={field.label} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `${field.name}-error` : undefined} value={value} required={field.required} rows={3} onChange={(event) => setValue(event.target.value)} className={inputClass} />
                ) : (
                  <input aria-label={field.label} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `${field.name}-error` : undefined} type={field.type} value={value} required={field.required} min={field.min} max={field.max} step={field.step} onChange={(event) => setValue(event.target.value)} className={inputClass} />
                )}
                {fieldError && <span id={`${field.name}-error`} className="block text-xs text-red-700">{fieldError}</span>}
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving} className="rounded bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Saving…' : `Add ${meta.title.slice(0, -1)}`}
          </button>
          {success && <span role="status" className="text-sm text-emerald-700">{success}</span>}
        </div>
        {formError && <div role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{formError.message}</p>{formError instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{formError.technicalMessage}</code></details>}</div>}
      </form>
      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Unable to load {meta.title.toLowerCase()}: {error.message}</p>{error instanceof ApiError && <details className="mt-1 text-xs"><summary>Technical detail</summary><code>{error.technicalMessage}</code></details>}</div>}
      <DataTable<RecordRow> columns={columnsFor[page] ?? []} data={rows} loading={loading} emptyMessage={search ? `No ${meta.title.toLowerCase()} match your search.` : 'No records exist in the connected database.'} />
    </div>
  );
};

export default ManagementPage;
