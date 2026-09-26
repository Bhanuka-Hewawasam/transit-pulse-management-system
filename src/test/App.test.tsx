import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('SmartMove application smoke tests', () => {
  it('renders the dashboard by default', () => {
    render(<App />);
    expect(screen.getByText('Welcome to SmartMove TMS 🚌')).toBeInTheDocument();
  });

  it('navigates to the Reports page', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    expect(screen.getByRole('heading', { name: 'Business Reports' })).toBeInTheDocument();
  });

  it('renders the Reports page controls and route report', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    expect(screen.getByRole('tab', { name: 'Most used routes' })).toBeInTheDocument();
    expect(screen.getByText('Business Reports')).toBeInTheDocument();
  });

  it('renders the passenger dashboard for the passenger route', () => {
    window.history.pushState({}, '', '/passenger');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Passenger Dashboard' })).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('renders the driver dashboard for the driver route', () => {
    window.history.pushState({}, '', '/driver');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Driver Dashboard' })).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });
});
