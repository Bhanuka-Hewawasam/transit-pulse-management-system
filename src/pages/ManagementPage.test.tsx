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
    return { ok: true, json: async () => ({ id: 25, ...payload }) } as Response;
  }
  return { ok: true, json: async () => [] } as Response;
});

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
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vehicle management form', () => {
  it('sends numeric year and capacity to the configured vehicles endpoint', async () => {
    render(<ManagementPage page="vehicles" />);
    fillVehicleDetails('2023', '4');
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));

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
    });
  });

  it.each([
    ['Year', '10000', '4', 'Year must be a whole number between 1000 and 9999.'],
    ['Seating capacity', '2023', '1000', 'Seating capacity must be a whole number between 1 and 999.'],
  ])('rejects an out-of-range %s without posting', async (field, year, capacity, message) => {
    render(<ManagementPage page="vehicles" />);
    fillVehicleDetails(year, capacity);
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/api/vehicles') && init?.method === 'POST')).toBe(false);
    expect(screen.getByLabelText(field)).toBeInTheDocument();
  });
});
