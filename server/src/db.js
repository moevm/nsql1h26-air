import { Database } from 'arangojs';

const dbName = process.env.ARANGO_DB_NAME || 'breathing_exercises';
const dbUrl = process.env.ARANGO_URL || 'http://db:8529';
const dbUser = process.env.ARANGO_USERNAME || 'root';
const dbPass = process.env.ARANGO_PASSWORD || 'rootpassword';

const systemDb = new Database({
  url: dbUrl,
  auth: {
    username: dbUser,
    password: dbPass
  }
});

const db = new Database({
  url: dbUrl,
  databaseName: dbName,
  auth: {
    username: dbUser,
    password: dbPass
  }
});

export async function initializeDatabase() {
  try {
    const databases = await systemDb.listDatabases();
    console.log('Available databases:', databases);

    if (!databases.includes(dbName)) {
      console.log(`Creating database: ${dbName}`);
      await systemDb.createDatabase(dbName);
      console.log('Database created');
    } else {
      console.log(`Database ${dbName} already exists`);
    }

    const collections = await db.listCollections();
    const collectionNames = collections.map(c => c.name);
    console.log('Existing collections:', collectionNames);

    const requiredCollections = {
      users: 'document',
      exercises: 'document',
      user_sessions: 'document',
      comments: 'document',
      reviews: 'document',
      statistics: 'document'
    };

    const requiredEdgeCollections = {
      user_favorites: 'edge'
    };

    for (const [name, type] of Object.entries(requiredCollections)) {
      if (!collectionNames.includes(name)) {
        await db.createCollection(name);
        console.log(`Collection ${name} created`);
      }
    }

    for (const [name, type] of Object.entries(requiredEdgeCollections)) {
      if (!collectionNames.includes(name)) {
        await db.createEdgeCollection(name);
        console.log(`Edge collection ${name} created`);
      }
    }

    await createIndexes();
    console.log('Database initialized successfully');

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function createIndexes() {
  const users = db.collection('users');
  await users.ensureIndex({ type: 'persistent', fields: ['email'], unique: true });
  await users.ensureIndex({ type: 'persistent', fields: ['username'], unique: true });

  const exercises = db.collection('exercises');
  await exercises.ensureIndex({ type: 'persistent', fields: ['title'] });
  await exercises.ensureIndex({ type: 'persistent', fields: ['category'] });
  await exercises.ensureIndex({ type: 'persistent', fields: ['difficulty'] });

  const comments = db.collection('comments');
  await comments.ensureIndex({ type: 'persistent', fields: ['exerciseId'] });
  await comments.ensureIndex({ type: 'persistent', fields: ['userId'] });

  const reviews = db.collection('reviews');
  await reviews.ensureIndex({ type: 'persistent', fields: ['exerciseId'] });
  await reviews.ensureIndex({ type: 'persistent', fields: ['userId'] });
  await reviews.ensureIndex({ type: 'persistent', fields: ['exerciseId', 'userId'], unique: true });
}

export default db;
