import { describe, expect, it } from 'vitest';
import { calculateSegmentFare, calculateTotalFare, orderedRouteStops } from './routeFare';

describe('route segment fare', () => {
  const route = {
    origin: 'Colombo',
    destination: 'Badulla',
    stops: ['Kandy', 'Nuwara Eliya', 'Welimada'],
    fareAmount: 580,
  };

  it('charges the full route fare from first stop to final stop', () => {
    expect(calculateSegmentFare(route, 'Colombo', 'Badulla')).toBe(580);
  });

  it('charges only the selected fraction of ordered route legs', () => {
    expect(calculateSegmentFare(route, 'Welimada', 'Badulla')).toBe(145);
    expect(calculateSegmentFare(route, 'Kandy', 'Welimada')).toBe(290);
  });

  it('rejects identical or reverse-order stops', () => {
    expect(calculateSegmentFare(route, 'Kandy', 'Kandy')).toBeNull();
    expect(calculateSegmentFare(route, 'Badulla', 'Welimada')).toBeNull();
  });

  it('keeps route endpoints once when supplied in the stop list', () => {
    expect(orderedRouteStops({ ...route, stops: ['Colombo', 'Kandy', 'Badulla'] }))
      .toEqual(['Colombo', 'Kandy', 'Badulla']);
  });

  it('multiplies a cent-normalized seat fare consistently for fractional values', () => {
    expect(calculateTotalFare('435.00', '4')).toBe(1740);
    expect(calculateTotalFare(144.99, 4)).toBe(579.96);
    expect(calculateTotalFare(435, 0)).toBeNull();
  });
});