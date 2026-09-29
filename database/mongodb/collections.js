// SmartMove MongoDB design. These commands create optional content collections.
db.createCollection('vehicle_documents');
db.createCollection('passenger_feedback');
db.createCollection('announcements');
db.createCollection('trip_media');

db.vehicle_documents.createIndex({ vehicleId: 1, documentType: 1 });
db.passenger_feedback.createIndex({ routeId: 1, rating: -1 });
db.announcements.createIndex({ status: 1, startDate: 1, endDate: 1 });
db.trip_media.createIndex({ tripId: 1 });
