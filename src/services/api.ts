export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly technicalMessage: string;

  constructor(
    message: string,
    status: number,
    technicalMessage: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.technicalMessage = technicalMessage;
  }
}

const friendlyError = (detail: string): string => {
  if (/ORA-00001/.test(detail)) return 'A record with a duplicate unique value already exists.';
  if (/ORA-02291/.test(detail)) return 'A selected related record does not exist. Refresh the choices and try again.';
  if (/ORA-01438/.test(detail)) return 'A number is outside the range allowed for this field. Check the value and try again.';
  if (/ORA-02290/.test(detail)) return 'One of the selected values is not allowed.';
  if (/ORA-018\d+/.test(detail)) return 'A date or time is invalid. Check the entered date and try again.';
  if (/ORA-00942/.test(detail)) return 'A required database table is missing. Contact the system administrator.';
  if (/ORA-02289/.test(detail)) return 'A required database sequence is missing. Contact the system administrator.';
  if (/ORA-\d{5}|NJS-|DPI-/.test(detail)) return 'The database could not complete this request. Check the connection and try again.';
  return detail;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, init);
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiError('The backend could not be reached. Make sure the API server is running.', 0, technicalMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const detail = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed with status ${response.status}`;
    throw new ApiError(friendlyError(detail), response.status, detail);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
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
