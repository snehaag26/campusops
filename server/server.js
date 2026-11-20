import 'dotenv/config';

const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'CLIENT_ORIGIN'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

if (process.env.DB_PASSWORD === undefined) {
  throw new Error('Missing required environment variable: DB_PASSWORD');
}

const { default: app } = await import('./src/app.js');
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`CampusOps API listening on port ${port}`);
});
