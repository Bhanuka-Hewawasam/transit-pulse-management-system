const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiEndpoints = {
  vehicles: '/vehicles',
  drivers: '/drivers',
  routes: '/routes',
  passengers: '/passengers',
  trips: '/trips',
  bookings: '/bookings',
  payments: '/payments',
  maintenance: '/maintenance',
  feedback: '/feedback',
} as const;
