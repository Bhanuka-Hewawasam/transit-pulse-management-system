import 'dotenv/config';
import app from './app.js';
import { mongodbHealth } from './mongodbAdapter.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`SmartMove API listening on http://localhost:${port}`);
  console.log(`Database mode: ${process.env.DATABASE_MODE ?? 'demo'}`);
  console.log(`Listening on ${host}:${port}`);
  void mongodbHealth().then((health) => {
    const uri = process.env.MONGODB_URI ? 'configured' : 'missing';
    const database = process.env.MONGODB_DATABASE ? 'configured' : 'missing';
    console.log(`MongoDB startup check: URI ${uri}, database ${database}, collections vehicle_documents, passenger_feedback, announcements, trip_media, connection ${health.connected ? 'healthy' : 'unavailable'}.`);
  });
});

server.on('error', (error: Error) => {
  console.error('SmartMove API failed to start:', error);
  process.exitCode = 1;
});

let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`SmartMove API received ${signal}; shutting down.`);
  server.close((error) => {
    if (error) {
      console.error('SmartMove API shutdown failed:', error);
      process.exit(1);
    }
    console.log('SmartMove API stopped.');
    process.exit(0);
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
