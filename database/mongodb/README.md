# SmartMove MongoDB content

These scripts provide the MongoDB content collections used by the SmartMove backend. Documents are schema-flexible: fields such as metadata, URLs, captions, IDs, and dates can vary by content type, and optional fields are not constrained by collection validators.

Run `collections.js`, then `sample_data.js`, in `mongosh` against a database such as `smartmove_demo`. Use `queries.js` for route reviews, rating summaries, complaint keyword searches, vehicle documents, trip media, and active announcements.

The collections are `vehicle_documents`, `passenger_feedback`, `announcements`, and `trip_media`. Existing installations using `passenger_reviews` or `travel_announcements` remain readable by the backend; new feedback and announcement writes use the required collection names. Replace demo URLs and sample records before production use.
