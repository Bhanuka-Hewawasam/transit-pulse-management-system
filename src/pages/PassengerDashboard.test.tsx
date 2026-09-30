import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PassengerDashboard from './PassengerDashboard';

const passenger = { id: 1, firstName: 'Asha', lastName: 'Perera', email: 'asha@example.com' };
const profile = {
  passengerId: 1, firstName: 'Asha', lastName: 'Perera', phone: null, address: null,
  email: 'asha@example.com', passportOrNic: 'PASS-1',
};
const booking = {
  bookingId: 11, tripId: 15, routeId: 5, routeCode: 'R005', vehicleId: 7, driverId: 3,
  origin: 'Colombo', destination: 'Kandy', bookingStatus: 'completed', tripStatus: 'completed',
  departureTime: '2026-09-28T10:00:00.000Z', arrivalTime: '2026-09-28T14:00:00.000Z',
  availableSeats: 10, paymentStatus: 'paid', amount: 500, canCancel: false, seatNumber: '1', bookingDate: null,
};

let feedbackStatus = 201;
let feedbackBody: Record<string, unknown> = { success: true, data: { _id: 'saved-review' } };
const feedbackCalls: Array<{ body: Record<string, unknown>; headers: Headers }> = [];
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = new URL(String(input)).pathname.replace(/^\/api/, '');
  if (path === '/mongodb/feedback' && init?.method === 'POST') {
    feedbackCalls.push({ body: JSON.parse(String(init.body)) as Record<string, unknown>, headers: new Headers(init.headers) });
    return { ok: feedbackStatus < 400, status: feedbackStatus, json: async () => feedbackBody } as Response;
  }
  const responses: Record<string, unknown> = {
    '/health/databases': { mode: 'demo' },
    '/passengers': [passenger],
    '/mongodb/content': { demo: true, announcements: [], reviews: [] },
    '/routes': [],
    '/passenger/profile': profile,
    '/passenger/bookings': [booking],
  };
  return { ok: true, status: 200, json: async () => responses[path] ?? [] } as Response;
});

beforeEach(() => {
  feedbackStatus = 201;
  feedbackBody = { success: true, data: { _id: 'saved-review' } };
  feedbackCalls.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const renderFeedback = async () => {
  render(<PassengerDashboard passengerId="1" activeTab="feedback" />);
  return screen.findByRole('button', { name: 'Submit review' });
};

describe('Passenger review submission', () => {
  it('validates comments and ratings before making the request', async () => {
    const submit = await renderFeedback();
    fireEvent.click(submit);
    expect(await screen.findByText('Comment is required.')).toBeInTheDocument();
    expect(feedbackCalls).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Rating'), { target: { value: '6' } });
    fireEvent.change(screen.getByPlaceholderText('Share details about your journey, bus condition, or driver...'), { target: { value: 'A trip review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(await screen.findByText('Rating must be a whole number from 1 to 5.')).toBeInTheDocument();
    expect(feedbackCalls).toHaveLength(0);
  });

  it('sends the selected passenger and trip context and confirms only a successful save', async () => {
    const submit = await renderFeedback();
    fireEvent.change(screen.getByLabelText('Review title (optional)'), { target: { value: 'Clean bus' } });
    fireEvent.change(screen.getByPlaceholderText('Share details about your journey, bus condition, or driver...'), { target: { value: 'Comfortable journey.' } });
    fireEvent.click(submit);

    expect(await screen.findByText('Review submitted successfully.')).toBeInTheDocument();
    expect(feedbackCalls[0].body).toMatchObject({
      type: 'review', passengerId: 1, passengerName: 'Asha Perera', routeId: 5, tripId: 15,
      vehicleId: 7, driverId: 3, rating: 5, title: 'Clean bus', comment: 'Comfortable journey.',
    });
    expect(feedbackCalls[0].headers.get('X-Passenger-Id')).toBe('1');
    expect(feedbackCalls[0].headers.get('X-Role')).toBe('passenger');
    expect(feedbackCalls[0].headers.get('Content-Type')).toBe('application/json');
  });

  it('shows the backend JSON error without showing a success message', async () => {
    feedbackStatus = 503;
    feedbackBody = { error: 'MongoDB is not connected. The review could not be saved.' };
    const submit = await renderFeedback();
    fireEvent.change(screen.getByPlaceholderText('Share details about your journey, bus condition, or driver...'), { target: { value: 'Keep this draft on failure.' } });
    fireEvent.click(submit);

    expect(await screen.findAllByText('MongoDB is not connected. The review could not be saved.')).toHaveLength(2);
    expect(screen.queryByText('Review submitted successfully.')).not.toBeInTheDocument();
  });
});