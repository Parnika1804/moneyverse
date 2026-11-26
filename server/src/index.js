import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(
    `MoneyVerse server listening on http://${HOST}:${PORT} (env=${process.env.NODE_ENV || 'development'})`,
  );
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down MoneyVerse server gracefully...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
