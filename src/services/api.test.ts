import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, API_BASE_URL, apiGet, apiPost } from './api';

const fetchMock = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('API service', () => {
  it('uses VITE_API_URL for GET requests', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await apiGet('/vehicles');

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/vehicles`, undefined);
  });

  it('maps Oracle foreign-key failures to a user-friendly message and retains the technical detail', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'ORA-02291: integrity constraint violated - parent key not found' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiPost('/bookings', {})).rejects.toMatchObject({
      name: 'ApiError',
      message: 'A selected related record does not exist. Refresh the choices and try again.',
      status: 400,
      technicalMessage: expect.stringContaining('ORA-02291'),
    });
  });

  it('returns a clear backend-unavailable message for network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/vehicles')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'The backend could not be reached. Make sure the API server is running.',
      status: 0,
      technicalMessage: 'Failed to fetch',
    } satisfies Partial<ApiError>);
  });
});
