// SmartMove MongoDB design. These commands create optional content collections.
db.createCollection('vehicle_documents');
db.createCollection('passenger_reviews');
db.createCollection('travel_announcements');
db.createCollection('trip_media');

db.vehicle_documents.createIndex({ vehicleId: 1, documentType: 1 });
db.passenger_reviews.createIndex({ routeCode: 1, rating: -1 });
db.travel_announcements.createIndex({ activeFrom: 1, activeTo: 1 });
db.trip_media.createIndex({ tripId: 1 });
