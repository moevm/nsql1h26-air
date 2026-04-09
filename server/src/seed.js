import db from './db.js';
import { aql } from 'arangojs';
import { testUsers, testExercises, testPhases, test478Phases, testAlternatePhases } from './testData.js';

export async function seedTestData() {
  try {
    const usersCursor = await db.query(aql`FOR u IN users LIMIT 1 RETURN u`);
    let hasUsers = false;

    try {
      const result = await usersCursor.next();
      hasUsers = !!result;
    } catch (e) {
      hasUsers = false;
    }

    if (hasUsers) {
      console.log('Database already has data, skipping seed');
      return;
    }

    console.log('Seeding users...');
    const users = db.collection('users');
    const userDocs = [];
    for (const user of testUsers) {
      const doc = await users.save(user);
      userDocs.push(doc);
    }

    console.log('Seeding exercises...');
    const exercises = db.collection('exercises');
    const exerciseDocs = [];

    const phasesSets = [
      testPhases,
      test478Phases,
      testAlternatePhases,
      testPhases,
      testPhases.map(p => ({ ...p, duration: p.duration * 1.5 })),
      testPhases.map(p => ({ ...p, duration: 6 })),
      testPhases.map(p => ({ ...p, duration: 3 })),
      testPhases
    ];

    for (let i = 0; i < testExercises.length; i++) {
      const exercise = testExercises[i];
      const phases = (phasesSets[i] || []).map((phase, order) => ({
        ...phase,
        order
      }));
      const doc = await exercises.save({
        ...exercise,
        phases
      });
      exerciseDocs.push(doc);
    }

    console.log('Seeding comments...');
    const comments = db.collection('comments');
    const sampleComments = [
      { exerciseId: exerciseDocs[0]._key, userId: userDocs[1]._key, text: 'This really helped me relax!' },
      { exerciseId: exerciseDocs[0]._key, userId: userDocs[2]._key, text: 'Great for stress relief' },
      { exerciseId: exerciseDocs[1]._key, userId: userDocs[1]._key, text: 'Helped me fall asleep faster' },
      { exerciseId: exerciseDocs[2]._key, userId: userDocs[2]._key, text: 'A bit challenging but effective' },
      { exerciseId: exerciseDocs[3]._key, userId: userDocs[1]._key, text: 'Perfect for beginners' }
    ];

    for (const comment of sampleComments) {
      await comments.save({
        ...comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    console.log('Seeding reviews...');
    const reviews = db.collection('reviews');
    const sampleReviews = [
      { exerciseId: exerciseDocs[0]._key, userId: userDocs[1]._key, rating: 5, text: 'Excellent technique!' },
      { exerciseId: exerciseDocs[0]._key, userId: userDocs[2]._key, rating: 4, text: 'Very helpful' },
      { exerciseId: exerciseDocs[1]._key, userId: userDocs[1]._key, rating: 5, text: 'Works great for sleep' },
      { exerciseId: exerciseDocs[2]._key, userId: userDocs[2]._key, rating: 4, text: 'Good for energy' },
      { exerciseId: exerciseDocs[3]._key, userId: userDocs[1]._key, rating: 5, text: 'My favorite exercise' }
    ];

    for (const review of sampleReviews) {
      await reviews.save({
        ...review,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    console.log('Seeding user sessions...');
    const sessions = db.collection('user_sessions');
    const sampleSessions = [
      { userId: userDocs[1]._key, exerciseId: exerciseDocs[0]._key, duration: 240, completed: true },
      { userId: userDocs[1]._key, exerciseId: exerciseDocs[1]._key, duration: 180, completed: true },
      { userId: userDocs[2]._key, exerciseId: exerciseDocs[0]._key, duration: 240, completed: true },
      { userId: userDocs[2]._key, exerciseId: exerciseDocs[2]._key, duration: 150, completed: false }
    ];

    for (const session of sampleSessions) {
      await sessions.save({
        ...session,
        createdAt: new Date().toISOString()
      });
    }

    console.log('Test data seeded successfully!');
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
}
