import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ManagementPage from './ManagementPage';

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.endsWith('/health/oracle')) {
    return { ok: true, json: async () => ({ connected: true }) } as Response;
  }
  if (init?.method === 'POST') {
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    const entity = url.slice(url.lastIndexOf('/') + 1);
    const saved = { id: 25, ...payload };
    savedRecords.set(entity, [...(savedRecords.get(entity) ?? []), saved]);
    return { ok: true, json: async () => saved } as Response;
  }
  const entity = url.slice(url.lastIndexOf('/') + 1);
  return { ok: true, json: async () => savedRecords.get(entity) ?? [] } as Response;
});
const savedRecords = new Map<string, Record<string, unknown>[]>();

const fillVehicleDetails = (year: string, capacity: string) => {
  fireEvent.change(screen.getByLabelText('Registration number'), { target: { value: 'WP-FRONT-1001' } });
  fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'Toyota' } });
  fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Prius' } });
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: year } });
  fireEvent.change(screen.getByLabelText('Vehicle type'), { target: { value: 'bus' } });
  fireEvent.change(screen.getByLabelText('Seating capacity'), { target: { value: capacity } });
  fireEvent.change(screen.getByLabelText('Fuel type'), { target: { value: 'petrol' } });
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });
};

beforeEach(() => {
  fetchMock.mockClear();
  savedRecords.clear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vehicle management form', () => {
  it('sends numeric year and capacity to the configured vehicles endpoint', async () => {
    render(<ManagementPage page="vehicles" />);
    fillVehicleDetails('2023', '4');
    fireEvent.click(screen.getByRole('button', { name: 'Add Vehicle' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/vehicles',
      expect.objectContaining({ method: 'POST' }),
    ));

    const postCall = fetchMock.mock.calls.find(([input, init]) => String(input) === 'http://localhost:3001/api/vehicles' && init?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      registrationNumber: 'WP-FRONT-1001',
      make: 'Toyota',
      model: 'Prius',
      year: 2023,
      type: 'bus',
      capacity: 4,
      fuelType: 'petrol',
      status: 'active',
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
    });
    expect(await screen.findByText('Vehicle saved to the backend.')).toBeInTheDocument();
    expect(await screen.findByText('WP-FRONT-1001')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith('/vehicles') && init?.method === undefined)).toHaveLength(2);
  });

  it.each([
    ['Year', '10000', '4', 'Year must be between 1000 and 9999.'],
    ['Seating capacity', '2023', '1000', 'Seating capacity must be between 1 and 999.'],
  ])('rejects an out-of-range %s without posting', async (field, year, capacity, message) => {
    render(<ManagementPage page="vehicles" />);
    fillVehicleDetails(year, capacity);
    fireEvent.click(screen.getByRole('button', { name: 'Add Vehicle' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/api/vehicles') && init?.method === 'POST')).toBe(false);
    expect(screen.getByLabelText(field)).toHaveAttribute('aria-invalid', 'true');
  });

  it('loads an empty database state and converts driver totals and rating to numbers', async () => {
    render(<ManagementPage page="drivers" />);
    expect(await screen.findByText('No records exist in the connected database.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Maya' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Perera' } });
    fireEvent.change(screen.getByLabelText('Licence number'), { target: { value: 'DL-9001' } });
    fireEvent.change(screen.getByLabelText('Licence expiry'), { target: { value: '2030-12-31' } });
    fireEvent.change(screen.getByLabelText('Total trips'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '4.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Driver' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/drivers') && init?.method === 'POST')).toBe(true));
    const postCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/drivers') && init?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({ totalTrips: 12, rating: 4.5, firstName: 'Maya', lastName: 'Perera' });
  });
});
