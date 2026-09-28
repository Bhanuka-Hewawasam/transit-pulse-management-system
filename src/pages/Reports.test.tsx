import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reports from './Reports';

let mockMode: 'oracle' | 'demo' = 'oracle';
let routeOrigin = 'Colombo';
let emptyRouteReport = false;
const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  const path = url.pathname.replace('/api', '');
  let body: unknown = [];
  if (path === '/health/databases') body = { mode: mockMode };
  if (path === '/routes') body = [{ id: 1, routeCode: 'R001', origin: 'Colombo', destination: 'Kandy', stops: [], distanceKm: 115, estimatedMinutes: 180, fareAmount: 350, isActive: true }];
  if (path === '/trips') body = [{ id: 10, routeId: 1, vehicleId: 1, driverId: 1, departureTime: '2026-09-28T08:00:00Z', arrivalTime: '2026-09-28T10:00:00Z', status: 'completed', availableSeats: 0, totalSeats: 40 }];
  if (path === '/bookings') body = [{ id: 20, tripId: 10, passengerId: 1, seatNumber: 'A1', bookingDate: '2026-09-27', status: 'confirmed', amount: 350 }];
  if (path === '/payments') body = [{ id: 30, bookingId: 20, amount: 350, paymentDate: '2026-09-28', method: 'cash', status: 'paid', transactionRef: 'TX-1' }];
  if (path === '/passengers') body = [{ id: 1, firstName: 'Maya', lastName: 'Perera', email: 'maya@example.com', phone: '', address: null, registeredDate: '2026-01-01', totalBookings: 1, passportOrNic: 'P1' }];
  if (path === '/reports/most-used-routes') body = emptyRouteReport ? [] : [{ routeId: 1, routeCode: 'R001', origin: routeOrigin, destination: 'Kandy', bookingCount: 8 }];
  if (path === '/reports/revenue') body = [{ paidPaymentCount: 1, totalRevenue: 350 }];
  return { ok: true, json: async () => body } as Response;
});

beforeEach(() => {
  mockMode = 'oracle';
  routeOrigin = 'Colombo';
  emptyRouteReport = false;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Business reports', () => {
  it('calls Oracle report endpoints with parameters from the report controls', async () => {
    routeOrigin = 'Colombo, Central';
    render(<Reports />);

    expect(await screen.findByText('R001 · Colombo, Central to Kandy')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/reports/most-used-routes?topN=5'))).toBe(true));

    let exportedBlob: Blob | undefined;
    const createObjectUrl = vi.fn((blob: Blob) => { exportedBlob = blob; return 'blob:report-csv'; });
    const revokeObjectUrl = vi.fn();
    const UrlWithCsvSupport = class extends URL {};
    Object.defineProperty(UrlWithCsvSupport, 'createObjectURL', { value: createObjectUrl });
    Object.defineProperty(UrlWithCsvSupport, 'revokeObjectURL', { value: revokeObjectUrl });
    vi.stubGlobal('URL', UrlWithCsvSupport);
    let downloadedFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedFilename = this.download; });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportedBlob as Blob);
    });
    expect(csv).toContain('Route,Bookings');
    expect(csv).toContain('"R001 · Colombo, Central to Kandy",8');
    expect(downloadedFilename).toMatch(/^smartmove-routes-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report-csv');

    fireEvent.click(screen.getByRole('tab', { name: 'Revenue by period' }));
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-09-30' } });

    expect(await screen.findByText('LKR 350.00')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/reports/revenue?fromDate=2026-09-01&toDate=2026-09-30'))).toBe(true);
  });

  it('keeps demo report calculations on entity-list data without calling report endpoints', async () => {
    mockMode = 'demo';
    render(<Reports />);

    expect(await screen.findByText('R001 · Colombo to Kandy')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/reports/'))).toBe(false);
  });

  it('disables CSV export when the current report has no rows', async () => {
    emptyRouteReport = true;
    render(<Reports />);

    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });
});
