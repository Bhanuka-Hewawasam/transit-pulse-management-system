// Run after sample_data.js. Queries are examples for the coursework demo.
// Reviews for a selected route:
db.passenger_feedback.find({
	routeId: "R005",
	type: "review"
}).sort({
	createdAt: -1
});
db.passenger_feedback.createIndex({
	routeId: 1,
	createdAt: -1
});
// Highest-rated vehicles or drivers:
db.passenger_feedback.aggregate([{ $group: { _id: '$vehicleId', averageRating: { $avg: '$rating' }, reviews: { $sum: 1 } } }, { $sort: { averageRating: -1 } }]);
db.passenger_feedback.aggregate([{ $group: { _id: '$driverId', averageRating: { $avg: '$rating' }, reviews: { $sum: 1 } } }, { $sort: { averageRating: -1 } }]);
// Search review titles and comments for common service topics:
db.passenger_feedback.find({
	$or: [
		{ title: { $regex: "delay|late|clean|service", $options: "i" } },
		{ comment: { $regex: "delay|late|clean|service", $options: "i" } }
	]
}).sort({
	createdAt: -1
});
// Vehicle documents and multimedia:
db.vehicle_documents.find({ vehicleId: 1 });
db.trip_media.find({ tripId: 10 });
// Active announcements:
const now = new Date();
db.announcements.find({ status: 'published', startDate: { $lte: now }, $or: [{ endDate: { $gte: now } }, { endDate: { $exists: false } }] });
