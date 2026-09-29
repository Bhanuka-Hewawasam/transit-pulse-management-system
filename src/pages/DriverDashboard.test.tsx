import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DriverDashboard from './DriverDashboard';

let mockMode: 'oracle' | 'demo' = 'oracle';
const driverProfile = {
  driverId: 3, firstName: 'Sunil', lastName: 'Fernando', phone: '077-456-7890', email: 'sunil@example.com',
  licenseNumber: 'B3456789', licenseExpiry: '2028-01-30', status: 'available', rating: 4.8, totalTrips: 145,
};
const upcomingTrip = {
  tripId: 18, routeCode: 'R018', origin: 'Colombo', destination: 'Kandy', departureTime: '2030-06-01T08:00:00Z',
  arrivalTime: '2030-06-01T11:00:00Z', status: 'scheduled', availableSeats: 12, totalSeats: 40,
  vehicleRegistration: 'WP-ABC-1234', seatsBooked: 28, canStart: true, canComplete: false,
};
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  let body: unknown = [];
  if (url.endsWith('/health/databases')) body = { mode: mockMode };
  else if (url.endsWith('/api/drivers')) body = [{ id: 3, firstName: 'Sunil', lastName: 'Fernando', licenseNumber: 'B3456789', licenseExpiry: '2028-01-30', phone: null, email: null, status: 'available', joinedDate: '2020-01-01', totalTrips: 145, rating: 4.8 }];
  else if (url.includes('/driver/summary')) body = { driverId: 3, firstName: 'Sunil', lastName: 'Fernando', status: 'available', licenseExpiry: '2028-01-30', todayTrips: 1, upcomingTrips: 2, completedTrips: 145, averageRating: 4.8, ratingCount: 6 };
  else if (url.includes('/driver/trips?filter=upcoming')) body = [upcomingTrip];
  else if (url.includes('/driver/trips?filter=in_progress')) body = [];
  else if (url.includes('/driver/trips?filter=completed')) body = [];
  else if (url.includes('/driver/trips/18/manifest')) body = [{ bookingId: 8, passengerId: 2, passengerName: 'Maya Perera', phone: '0770000000', seatNumber: 'A1', bookingStatus: 'confirmed', paymentStatus: 'paid' }];
  else if (url.includes('/driver/vehicle')) body = { vehicleId: 4, registrationNumber: 'WP-ABC-1234', make: 'Tata', model: 'Starbus', vehicleType: 'bus', seatingCapacity: 40, fuelType: 'diesel', status: 'active', nextMaintenanceDate: '2030-06-20' };
  else if (url.includes('/driver/feedback-summary')) body = { averageRating: 4.8, ratingCount: 6, recentComments: [] };
  else if (url.includes('/driver/profile')) body = driverProfile;
  else if (url.includes('/start') && init?.method === 'POST') body = { tripId: 18, status: 'in_progress' };
  return { ok: true, json: async () => body } as Response;
});

beforeEach(() => {
  mockMode = 'oracle';
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('Driver dashboard', () => {
  it('sends the acting-driver header, loads summary tabs, and confirms a server-authorized start', async () => {
    render(<DriverDashboard />);
    fireEvent.change(screen.getByLabelText('Acting driver ID'), { target: { value: '3' } });

    expect(await screen.findByRole('heading', { name: 'Welcome, Sunil' })).toBeInTheDocument();
    expect(screen.getByText('WP-ABC-1234')).toBeInTheDocument();
    const driverCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/driver/'));
    expect(driverCalls.length).toBeGreaterThan(0);
    expect(driverCalls.every(([, init]) => new Headers(init?.headers).get('X-Driver-Id') === '3')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Start trip' }));
    expect(await screen.findByRole('dialog', { name: 'Start trip?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm start' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/api/driver/trips/18/start') && init?.method === 'POST')).toBe(true));
    const startCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/driver/trips/18/start') && init?.method === 'POST');
    expect(new Headers(startCall?.[1]?.headers).get('X-Driver-Id')).toBe('3');
  });

  it('keeps the demo driver picker and displays the passenger manifest', async () => {
    mockMode = 'demo';
    render(<DriverDashboard />);
    const driverInput = await screen.findByLabelText('Driver profile');
    fireEvent.change(driverInput, { target: { value: 'Sunil' } });
    fireEvent.click(screen.getByText('Sunil Fernando'));
    expect(await screen.findByRole('heading', { name: 'Welcome, Sunil' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View passengers' }));
    expect(await screen.findByRole('dialog', { name: 'Passengers · R018' })).toBeInTheDocument();
    expect(await screen.findAllByText('Maya Perera')).toHaveLength(2);
    const driverCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/driver/'));
    expect(driverCalls.every(([, init]) => new Headers(init?.headers).get('X-Driver-Id') === '3')).toBe(true);
  });
});
