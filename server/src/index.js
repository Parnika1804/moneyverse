import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`MoneyVerse API listening on http://127.0.0.1:${PORT} (bound to ${HOST})`);
});
