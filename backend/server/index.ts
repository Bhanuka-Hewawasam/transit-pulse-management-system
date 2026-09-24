import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`SmartMove API listening on http://localhost:${port}`);
  console.log('Using local demo adapter; Oracle and MongoDB are not connected.');
});
