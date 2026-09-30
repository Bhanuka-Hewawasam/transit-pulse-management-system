import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MongoDBContent from './MongoDBContent';

const announcements: Record<string, unknown>[] = [];
const mediaRecords: Record<string, unknown>[] = [];
const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method === 'PATCH') {
    const payload = JSON.parse(String(init.body)) as { status: string };
    const url = String(_input);
    const mediaId = url.split('/').at(-2);
    const media = mediaRecords.find((item) => item.id === mediaId);
    if (media) Object.assign(media, payload, { visibility: payload.status === 'approved' ? 'public' : 'hidden' });
    return { ok: Boolean(media), json: async () => media ?? { error: 'Not found' } } as Response;
  }
  if (init?.method === 'POST') {
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    const saved = { ...payload, id: `announcement-${announcements.length + 1}` };
    announcements.push(saved);
    return { ok: true, json: async () => saved } as Response;
  }
  return {
    ok: true,
    json: async () => ({ demo: true, reviews: [], announcements: [...announcements], documents: [], media: mediaRecords }),
  } as Response;
});

beforeEach(() => {
  announcements.length = 0;
  mediaRecords.splice(0, mediaRecords.length,
    { id: 'media-pending', type: 'photo', title: 'Trip arrival photo', caption: 'Bus at terminal', tripId: 18, tripName: 'R018 · Colombo to Kandy', routeId: 4, routeName: 'R018 · Colombo to Kandy', vehicleNumber: 'WP-ABC-1234', driverName: 'Sunil Fernando', createdAt: '2026-09-29T10:00:00.000Z', uploadedBy: 'driver:3', status: 'pending', visibility: 'hidden', url: '/api/mongodb/media/media-pending/image' },
    { id: 'media-approved', type: 'photo', title: 'Departure bay', tripId: 18, tripName: 'R018 · Colombo to Kandy', routeId: 4, routeName: 'R018 · Colombo to Kandy', vehicleNumber: 'WP-ABC-1234', driverName: 'Sunil Fernando', createdAt: '2026-09-28T10:00:00.000Z', uploadedBy: 'driver:3', status: 'approved', visibility: 'public', mediaType: 'photo' },
    { id: 'media-rejected', type: 'photo', title: 'Unrelated upload', tripId: 19, routeId: 5, driverName: 'Maya Silva', uploadedBy: 'driver:2', status: 'rejected', visibility: 'hidden', mediaType: 'photo' },
  );
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('MongoDB content announcements', () => {
  it('shows announcement creation only to admins', async () => {
    render(<MongoDBContent role="passenger" />);

    expect(await screen.findByText('Demo fallback content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Announcement' })).not.toBeInTheDocument();
  });

  it('saves drafts and published announcements, then refreshes the list', async () => {
    render(<MongoDBContent role="admin" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add Announcement' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Planned disruption' } });
    fireEvent.change(screen.getByLabelText('Message / content'), { target: { value: 'Allow extra travel time.' } });
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'passengers' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(await screen.findByText('Planned disruption')).toBeInTheDocument();
    expect(announcements[0]).toMatchObject({ title: 'Planned disruption', audience: 'passengers', status: 'draft', priority: 'normal' });

    fireEvent.click(screen.getByRole('button', { name: 'Add Announcement' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Weekend service' } });
    fireEvent.change(screen.getByLabelText('Message / content'), { target: { value: 'Additional services are operating.' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'scheduled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Announcement' }));

    expect(await screen.findByText('Weekend service')).toBeInTheDocument();
    expect(announcements[1]).toMatchObject({ title: 'Weekend service', audience: 'all', status: 'scheduled' });
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === undefined)).toHaveLength(3));
    expect(await screen.findByText('Announcement saved successfully.')).toBeInTheDocument();
  });

  it('filters trip media, displays review metadata, and approves pending uploads', async () => {
    render(<MongoDBContent role="admin" />);

    expect(await screen.findByRole('heading', { name: 'Trip Media' })).toBeInTheDocument();
    expect(screen.getByText('Trip arrival photo')).toBeInTheDocument();
    expect(screen.getByText('Bus at terminal')).toBeInTheDocument();
    expect(screen.getAllByText('WP-ABC-1234')).toHaveLength(2);
    expect(screen.getAllByText('Sunil Fernando')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Trip arrival photo' })).toHaveAttribute('src', expect.stringContaining('/api/mongodb/media/media-pending/image'));
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Reject' })).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Media approval status'), { target: { value: 'approved' } });
    expect(screen.queryByText('Trip arrival photo')).not.toBeInTheDocument();
    expect(screen.getByText('Departure bay')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Media approval status'), { target: { value: 'pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    expect(await screen.findByRole('dialog', { name: 'Trip arrival photo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Trip media approved.')).toBeInTheDocument();
    expect(mediaRecords[0]).toMatchObject({ status: 'approved', visibility: 'public' });
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});