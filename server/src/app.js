import cors from 'cors';
import express from 'express';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = express();
const routesDirectory = fileURLToPath(new URL('./routes/', import.meta.url));

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

for (const fileName of (await readdir(routesDirectory)).filter((name) => name.endsWith('.js')).sort()) {
  const { default: router } = await import(pathToFileURL(join(routesDirectory, fileName)));
  app.use(`/api/${fileName.slice(0, -3)}`, router);
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with these details already exists' });
  }

  if (error.sqlState === '45000' || error.sqlstate === '45000') {
    return res.status(409).json({ error: error.sqlMessage || error.message || 'Request conflicts with a database rule' });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});

export default app;
