import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MongoDBContent from './MongoDBContent';

const announcements: Record<string, unknown>[] = [];
const mediaRecords: Record<string, unknown>[] = [];
const feedbackRecords: Record<string, unknown>[] = [];
const documentRecords: Record<string, unknown>[] = [];
let failNextDocumentSave = false;
let mongoContentLive = false;
const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method === 'PATCH') {
    const url = String(_input);
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    if (url.includes('/mongodb/documents/')) {
      const documentId = url.split('/').at(-1);
      const document = documentRecords.find((item) => item._id === documentId);
      if (document) Object.assign(document, payload);
      return { ok: Boolean(document), json: async () => document ?? { error: 'Not found' } } as Response;
    }
    const mediaId = url.split('/').at(-2);
    const media = mediaRecords.find((item) => item.id === mediaId);
    if (media) Object.assign(media, payload, { visibility: payload.status === 'approved' ? 'public' : 'hidden' });
    return { ok: Boolean(media), json: async () => media ?? { error: 'Not found' } } as Response;
  }
  if (init?.method === 'DELETE') {
    const documentId = String(_input).split('/').at(-1);
    const index = documentRecords.findIndex((item) => item._id === documentId);
    if (index >= 0) documentRecords.splice(index, 1);
    return { ok: index >= 0, json: async () => ({ success: index >= 0 }) } as Response;
  }
  if (init?.method === 'POST') {
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    if (String(_input).endsWith('/mongodb/documents')) {
      if (failNextDocumentSave) {
        failNextDocumentSave = false;
        return { ok: false, status: 503, json: async () => ({ error: 'MongoDB is unavailable; the vehicle document could not be saved.' }) } as Response;
      }
      const saved = { ...payload, _id: `document-${documentRecords.length + 1}` };
      documentRecords.push(saved);
      return { ok: true, json: async () => saved } as Response;
    }
    const saved = { ...payload, id: `announcement-${announcements.length + 1}` };
    announcements.push(saved);
    return { ok: true, json: async () => saved } as Response;
  }
  if (String(_input).endsWith('/mongodb/feedback')) {
    return { ok: true, json: async () => [...feedbackRecords] } as Response;
  }
  return {
    ok: true,
    json: async () => ({ demo: !mongoContentLive, reviews: [], announcements: [...announcements], documents: [...documentRecords], media: mediaRecords }),
  } as Response;
});

beforeEach(() => {
  announcements.length = 0;
  feedbackRecords.length = 0;
  failNextDocumentSave = false;
  mongoContentLive = false;
  documentRecords.splice(0, documentRecords.length, { _id: 'document-existing', vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'registration', fileUrl: '/docs/registration.pdf', expiresOn: '2027-12-31' });
  mediaRecords.splice(0, mediaRecords.length,
    { id: 'media-pending', type: 'photo', title: 'Trip arrival photo', caption: 'Bus at terminal', tripId: 18, tripName: 'R018 · Colombo to Kandy', routeId: 4, routeName: 'R018 · Colombo to Kandy', vehicleNumber: 'WP-ABC-1234', driverName: 'Sunil Fernando', createdAt: '2026-09-29T10:00:00.000Z', uploadedBy: 'driver:3', status: 'pending', visibility: 'hidden', url: '/api/mongodb/media/media-pending/image' },
    { id: 'media-approved', type: 'photo', title: 'Departure bay', tripId: 18, tripName: 'R018 · Colombo to Kandy', routeId: 4, routeName: 'R018 · Colombo to Kandy', vehicleNumber: 'WP-ABC-1234', driverName: 'Sunil Fernando', createdAt: '2026-09-28T10:00:00.000Z', uploadedBy: 'driver:3', status: 'approved', visibility: 'public', mediaType: 'photo' },
    { id: 'media-rejected', type: 'photo', title: 'Unrelated upload', tripId: 19, routeId: 5, driverName: 'Maya Silva', uploadedBy: 'driver:2', status: 'rejected', visibility: 'hidden', mediaType: 'photo' },
  );
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('MongoDB content and document management', () => {
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
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === undefined)).toHaveLength(6));
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

  it('loads and renders feedback from the API newest first with review details', async () => {
    feedbackRecords.push(
      { _id: 'older', type: 'review', passengerId: 2, passengerName: 'Older Passenger', rating: 3, title: 'Older review', comment: 'Earlier comment', status: 'new', routeId: 'R002', tripId: 12, vehicleId: 4, driverId: 5, createdAt: '2026-09-28T10:00:00.000Z' },
      { _id: 'newer', type: 'review', passengerId: 1, passengerName: 'Newer Passenger', rating: 5, title: 'Latest review', comment: 'The bus was clean.', status: 'new', routeId: 'R005', tripId: 15, vehicleId: 7, driverId: 3, createdAt: '2026-09-30T10:00:00.000Z' },
    );
    render(<MongoDBContent role="admin" />);

    expect(await screen.findByText('Latest review')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter content' }), { target: { value: 'reviews' } });
    const cards = screen.getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Newer Passenger');
    expect(cards[0]).toHaveTextContent('The bus was clean.');
    expect(cards[0]).toHaveTextContent('R005');
    expect(cards[0]).toHaveTextContent('Trip#15');
    expect(cards[0]).toHaveTextContent('Vehicle7');
    expect(cards[0]).toHaveTextContent('Driver3');
    expect(cards[1]).toHaveTextContent('Older Passenger');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/mongodb/feedback'), undefined);
  });

  it('creates, updates, and deletes vehicle documents and refreshes the list', async () => {
    mongoContentLive = true;
    render(<MongoDBContent role="admin" />);
    expect(await screen.findByText('WP-CAB-1234 · registration')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Vehicle Document' }));
    fireEvent.change(screen.getByLabelText('Vehicle ID'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Registration'), { target: { value: 'SP-KLM-3456' } });
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'inspection' } });
    fireEvent.change(screen.getByLabelText('Expiry date'), { target: { value: '2028-10-15' } });
    fireEvent.change(screen.getByLabelText('Document URL or path'), { target: { value: '/docs/inspection.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save document' }));

    expect(await screen.findByText('SP-KLM-3456 · inspection')).toBeInTheDocument();
    expect(documentRecords[1]).toMatchObject({ vehicleId: 4, registration: 'SP-KLM-3456', documentType: 'inspection', fileUrl: '/docs/inspection.pdf', expiresOn: '2028-10-15' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/mongodb/documents'), expect.objectContaining({ method: 'POST' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit vehicle document SP-KLM-3456 · inspection' }));
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'insurance' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('SP-KLM-3456 · insurance')).toBeInTheDocument();
    expect(documentRecords[1].documentType).toBe('insurance');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/mongodb/documents/document-2'), expect.objectContaining({ method: 'PATCH' }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete vehicle document SP-KLM-3456 · insurance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete document' }));

    await waitFor(() => expect(screen.queryByText('SP-KLM-3456 · insurance')).not.toBeInTheDocument());
    expect(documentRecords).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/mongodb/documents/document-2'), { method: 'DELETE' });
  });

  it('shows the MongoDB error instead of claiming an unavailable document save succeeded', async () => {
    failNextDocumentSave = true;
    render(<MongoDBContent role="admin" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Vehicle Document' }));
    fireEvent.change(screen.getByLabelText('Vehicle ID'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Registration'), { target: { value: 'WP-CAB-1234' } });
    fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'insurance' } });
    fireEvent.change(screen.getByLabelText('Document URL or path'), { target: { value: '/docs/insurance.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save document' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('MongoDB is unavailable; the vehicle document could not be saved.');
    expect(screen.queryByText('Vehicle document saved.')).not.toBeInTheDocument();
    expect(documentRecords).toHaveLength(1);
  });
});