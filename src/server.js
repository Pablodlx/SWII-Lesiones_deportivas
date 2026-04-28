const app = require('./app');
const { connectDb } = require('./db');
const { port } = require('./config');

async function start() {
  await connectDb();
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Error starting server:', err.message);
  process.exit(1);
});
