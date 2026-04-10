import express from 'express';
import cors from 'cors';
import db, { initializeDatabase } from './db.js';
import routes from './routes.js';
import { seedTestData } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('Waiting for database connection...');
    let retries = 0;
    const maxRetries = 30;

    while (retries < maxRetries) {
      try {
        console.log(`Database connection attempt ${retries + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Initializing database...');
        await initializeDatabase();
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        console.log(`Connection failed, retrying... (${retries}/${maxRetries})`);
      }
    }

    console.log('Seeding test data...');
    await seedTestData();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
