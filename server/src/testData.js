import bcrypt from 'bcrypt';

const hashPassword = (password) => bcrypt.hashSync(password, 10);

export const testUsers = [
  {
    username: 'admin',
    email: 'admin@breathe.app',
    password: hashPassword('admin123'),
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString()
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: hashPassword('user123'),
    role: 'user',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString()
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: hashPassword('user123'),
    role: 'user',
    firstName: 'Jane',
    lastName: 'Smith',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-02-01').toISOString()
  }
];

export const testExercises = [
  {
    title: 'Box Breathing',
    description: 'A simple relaxation technique that can help you return to a state of calm',
    category: 'Relaxation',
    difficulty: 'Beginner',
    duration: 240,
    imageUrl: '/images/exercise-1.svg',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString()
  },
  {
    title: '4-7-8 Breathing',
    description: 'A breathing pattern designed to reduce anxiety and help you sleep',
    category: 'Sleep',
    difficulty: 'Beginner',
    duration: 180,
    imageUrl: '/images/exercise-2.svg',
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-05').toISOString()
  },
  {
    title: 'Alternate Nostril Breathing',
    description: 'A yogic breathing technique that helps balance the nervous system',
    category: 'Energy',
    difficulty: 'Intermediate',
    duration: 300,
    imageUrl: '/images/exercise-3.svg',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-01-10').toISOString()
  },
  {
    title: 'Diaphragmatic Breathing',
    description: 'Deep breathing technique for stress relief and better oxygen flow',
    category: 'Relaxation',
    difficulty: 'Beginner',
    duration: 180,
    imageUrl: '/images/exercise-4.svg',
    createdAt: new Date('2024-01-12').toISOString(),
    updatedAt: new Date('2024-01-12').toISOString()
  },
  {
    title: 'Wim Hof Method',
    description: 'Powerful breathing technique for energy and cold resistance',
    category: 'Energy',
    difficulty: 'Advanced',
    duration: 420,
    imageUrl: '/images/exercise-5.svg',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString()
  },
  {
    title: 'Coherent Breathing',
    description: 'Breathing at 5 breaths per minute for optimal heart rate variability',
    category: 'Focus',
    difficulty: 'Intermediate',
    duration: 300,
    imageUrl: '/images/exercise-6.svg',
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString()
  },
  {
    title: 'Breath of Fire',
    description: 'Rapid diaphragmatic breathing for energy and detoxification',
    category: 'Energy',
    difficulty: 'Advanced',
    duration: 180,
    imageUrl: '/images/exercise-7.svg',
    createdAt: new Date('2024-01-25').toISOString(),
    updatedAt: new Date('2024-01-25').toISOString()
  },
  {
    title: 'Pursed Lip Breathing',
    description: 'Technique for people with COPD to improve breathing efficiency',
    category: 'Therapeutic',
    difficulty: 'Beginner',
    duration: 240,
    imageUrl: '/images/exercise-8.svg',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date('2024-02-01').toISOString()
  }
];

export const testPhases = [
  { name: 'Inhale', duration: 4, instruction: 'Breathe in slowly through your nose', color: '#3b82f6' },
  { name: 'Hold', duration: 4, instruction: 'Hold your breath gently', color: '#8b5cf6' },
  { name: 'Exhale', duration: 4, instruction: 'Breathe out slowly through your mouth', color: '#10b981' },
  { name: 'Hold', duration: 4, instruction: 'Hold your breath gently', color: '#f59e0b' }
];

export const test478Phases = [
  { name: 'Inhale', duration: 4, instruction: 'Breathe in through your nose', color: '#3b82f6' },
  { name: 'Hold', duration: 7, instruction: 'Hold your breath', color: '#8b5cf6' },
  { name: 'Exhale', duration: 8, instruction: 'Exhale completely through your mouth', color: '#10b981' }
];

export const testAlternatePhases = [
  { name: 'Close Right', duration: 2, instruction: 'Close right nostril with thumb', color: '#3b82f6' },
  { name: 'Inhale Left', duration: 4, instruction: 'Inhale through left nostril', color: '#8b5cf6' },
  { name: 'Hold', duration: 4, instruction: 'Hold both nostrils closed', color: '#f59e0b' },
  { name: 'Exhale Right', duration: 4, instruction: 'Release thumb and exhale through right', color: '#10b981' },
  { name: 'Inhale Right', duration: 4, instruction: 'Inhale through right nostril', color: '#3b82f6' },
  { name: 'Hold', duration: 4, instruction: 'Hold both nostrils closed', color: '#f59e0b' },
  { name: 'Exhale Left', duration: 4, instruction: 'Exhale through left nostril', color: '#10b981' }
];
