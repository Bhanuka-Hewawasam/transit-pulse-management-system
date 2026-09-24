# MongoDB integration

MongoDB is an optional content store for vehicle documents, passenger reviews, announcements, and trip media. The current UI does not claim a live connection. Use the scripts in `database/mongodb` with `mongosh` when a MongoDB instance is available.

The backend checks `MONGODB_URI` and `MONGODB_DATABASE`, then pings MongoDB before reporting `connected: true`. The health endpoints are `/api/health/mongodb` and `/api/health/databases`. Without valid credentials, MongoDB Content is served from the backend demo fallback.
