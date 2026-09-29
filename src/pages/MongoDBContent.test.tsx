import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MongoDBContent from './MongoDBContent';

const announcements: Record<string, unknown>[] = [];
const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method === 'POST') {
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    const saved = { ...payload, id: `announcement-${announcements.length + 1}` };
    announcements.push(saved);
    return { ok: true, json: async () => saved } as Response;
  }
  return {
    ok: true,
    json: async () => ({ demo: true, reviews: [], announcements: [...announcements], documents: [], media: [] }),
  } as Response;
});

beforeEach(() => {
  announcements.length = 0;
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
});