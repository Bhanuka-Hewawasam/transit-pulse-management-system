// SAMPLE/DEMO DATA ONLY. No live MongoDB integration is configured in the web app.
db.vehicle_documents.insertMany([
  { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'insurance', expiresOn: ISODate('2026-12-31'), fileUrl: '/demo/insurance-wp-cab.pdf' },
  { vehicleId: 4, registration: 'SP-KLM-3456', documentType: 'inspection', expiresOn: ISODate('2025-10-15'), fileUrl: '/demo/inspection-sp-klm.pdf' }
]);
db.passenger_reviews.insertMany([
  { passengerId: 1, routeCode: 'R001', vehicleId: 1, driverId: 1, rating: 5, comment: 'Clean bus and punctual service.', createdAt: ISODate('2025-09-24') },
  { passengerId: 9, routeCode: 'R005', vehicleId: 9, driverId: 3, rating: 2, comment: 'The bus was overcrowded and the AC was not working.', createdAt: ISODate('2025-09-24') }
]);
db.travel_announcements.insertOne({ title: 'Holiday timetable', body: 'Extra Colombo to Kandy trips are available.', activeFrom: ISODate('2025-09-20'), activeTo: ISODate('2025-10-05'), active: true });
db.trip_media.insertOne({ tripId: 10, routeCode: 'R001', mediaType: 'photo', url: '/demo/trip-10.jpg', caption: 'Vehicle departure bay' });
