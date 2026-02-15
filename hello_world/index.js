// hello_world/index.js
const { Database } = require('arangojs');
require('dotenv').config();

async function main() {
  console.log(' Starting ArangoDB Hello World example');
  
  const db = new Database({
    url: process.env.ARANGO_URL || 'http://localhost:8529',
    databaseName: process.env.ARANGO_DB || '_system',
    auth: {
      username: process.env.ARANGO_USERNAME || 'root',
      password: process.env.ARANGO_PASSWORD || 'password'
    }
  });

  try {
    console.log(' Connected to database');
    
    const collection = db.collection('exercises');
    
    const exists = await collection.exists();
    if (!exists) {
      await collection.create();
      console.log(' Exercises collection created');
    }
    
    const exercise = {
      name: 'Deep breathing exercise',
      description: 'Breathe deeply for 5 minutes',
      duration: 300,
      category: 'Relaxation',
      createdAt: new Date().toISOString()
    };
    
    const meta = await collection.save(exercise);
    console.log('Added new exercise:', meta._key);
    
    const cursor = await db.query(`
      FOR exercise IN exercises
      RETURN exercise
    `);
    
    const exercises = await cursor.all();
    console.log('Exercises in database:');
    exercises.forEach(ex => {
      console.log(`  - ${ex.name} (duration: ${ex.duration} seconds)`);
    });
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();