// SAMPLE/DEMO DATA ONLY. No live MongoDB integration is configured in the web app.
db.vehicle_documents.insertMany([
  { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'vehicle_image', fileUrl: '/demo/wp-cab.jpg', metadata: { format: 'jpg', size: 184000 } },
  { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'registration', expiresOn: ISODate('2027-12-31'), fileUrl: '/demo/registration-wp-cab.pdf' },
  { vehicleId: 1, registration: 'WP-CAB-1234', documentType: 'insurance', expiresOn: ISODate('2026-12-31'), fileUrl: '/demo/insurance-wp-cab.pdf' },
  { vehicleId: 4, registration: 'SP-KLM-3456', documentType: 'inspection', expiresOn: ISODate('2027-10-15'), fileUrl: '/demo/inspection-sp-klm.pdf', metadata: { result: 'passed' } }
]);
db.passenger_feedback.insertMany([
  { type: 'review', passengerId: 1, routeId: 1, tripId: 10, vehicleId: 1, driverId: 1, rating: 5, comment: 'Clean bus and punctual service.', createdAt: ISODate('2025-09-24') },
  { type: 'complaint', passengerId: 9, routeId: 5, tripId: 14, vehicleId: 9, driverId: 3, rating: 2, complaint: 'The bus was overcrowded.', comment: 'The AC was not working.', createdAt: ISODate('2025-09-24') }
]);
db.announcements.insertOne({ type: 'announcement', title: 'Holiday timetable', message: 'Extra Colombo to Kandy trips are available.', audience: 'all', priority: 'normal', status: 'published', startDate: ISODate('2026-09-20'), endDate: ISODate('2026-10-05'), routeId: 1, active: true });
db.trip_media.insertMany([
  { tripId: 10, routeId: 1, mediaType: 'photo', url: '/demo/trip-10.jpg', caption: 'Vehicle departure bay', uploadedBy: 'driver:1' },
  { tripId: 10, routeId: 1, mediaType: 'journey_document', url: '/demo/trip-10-log.pdf', caption: 'Journey report', uploadedBy: 'admin:1' }
]);
