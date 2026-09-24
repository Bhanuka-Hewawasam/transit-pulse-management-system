// Run after sample_data.js. Queries are examples for the coursework demo.
// Reviews for a selected route:
db.passenger_reviews.find({ routeCode: 'R001' }).sort({ createdAt: -1 });
// Highest-rated vehicles or drivers:
db.passenger_reviews.aggregate([{ $group: { _id: '$vehicleId', averageRating: { $avg: '$rating' }, reviews: { $sum: 1 } } }, { $sort: { averageRating: -1 } }]);
db.passenger_reviews.aggregate([{ $group: { _id: '$driverId', averageRating: { $avg: '$rating' }, reviews: { $sum: 1 } } }, { $sort: { averageRating: -1 } }]);
// Keyword complaint search:
db.passenger_reviews.find({ comment: { $regex: 'overcrowded|late|broken|not working|complaint', $options: 'i' } });
// Vehicle documents and multimedia:
db.vehicle_documents.find({ vehicleId: 1 });
db.trip_media.find({ tripId: 10 });
// Active announcements:
const now = new Date();
db.travel_announcements.find({ active: true, activeFrom: { $lte: now }, activeTo: { $gte: now } });
