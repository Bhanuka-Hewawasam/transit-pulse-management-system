export type RouteFare = {
  origin: string;
  destination: string;
  stops?: string[];
  fareAmount: number;
};

const normalizeStop = (stop: string) => stop.trim().toLocaleLowerCase();

export const orderedRouteStops = (route: RouteFare): string[] => {
  const stops = [route.origin, ...(route.stops ?? []), route.destination]
    .map((stop) => stop.trim())
    .filter(Boolean);
  return stops.filter((stop, index) => index === 0 || normalizeStop(stop) !== normalizeStop(stops[index - 1]));
};

export const calculateSegmentFare = (route: RouteFare, pickupPoint: string, dropoffPoint: string): number | null => {
  if (!Number.isFinite(route.fareAmount) || route.fareAmount < 0) return null;
  if (!pickupPoint.trim() || !dropoffPoint.trim() || normalizeStop(pickupPoint) === normalizeStop(dropoffPoint)) return null;

  const stops = orderedRouteStops(route);
  const pickupIndex = stops.findIndex((stop) => normalizeStop(stop) === normalizeStop(pickupPoint));
  const dropoffIndex = stops.findIndex((stop, index) => index > pickupIndex && normalizeStop(stop) === normalizeStop(dropoffPoint));
  const totalLegs = stops.length - 1;
  if (pickupIndex < 0 || dropoffIndex <= pickupIndex || totalLegs <= 0) return null;

  const fullFareCents = Math.round(route.fareAmount * 100);
  const selectedLegs = dropoffIndex - pickupIndex;
  return Math.round(fullFareCents * selectedLegs / totalLegs) / 100;
};

export const calculateTotalFare = (fareValue: unknown, seatCountValue: unknown): number | null => {
  const farePerSeat = Number(fareValue ?? 0);
  const seatCount = Number(seatCountValue ?? 0);
  if (!Number.isFinite(farePerSeat) || farePerSeat < 0 || !Number.isInteger(seatCount) || seatCount < 1) return null;
  return Math.round(farePerSeat * 100) * seatCount / 100;
};