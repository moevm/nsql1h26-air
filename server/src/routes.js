import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { aql } from 'arangojs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const sortPhasesByOrder = (phases) => [...phases].sort((a, b) => a.order - b.order);
const isValidDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const buildFilterAql = (filters) => {
  if (filters.length === 0) {
    return aql``;
  }

  const combinedFilters = filters.slice(1).reduce(
    (query, filter) => aql`${query} AND ${filter}`,
    filters[0]
  );

  return aql`FILTER ${combinedFilters}`;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const users = db.collection('users');
    const result = await users.save({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const token = jwt.sign({ id: result._key, username, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: result._key, username, email, role: 'user' } });
  } catch (error) {
    if (error.errorNum === 1210) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const users = db.collection('users');
    const cursor = await db.query(aql`
      FOR u IN users
      FILTER u.username == ${username} OR u.email == ${username}
      RETURN u
    `);

    const user = await cursor.next();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._key, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._key,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/exercises', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      title,
      category,
      difficulty,
      minDuration,
      maxDuration,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = [];

    if (title) filters.push(aql`LIKE(LOWER(e.title), ${`%${title.toLowerCase()}%`}, true)`);
    if (category) filters.push(aql`e.category == ${category}`);
    if (difficulty) filters.push(aql`e.difficulty == ${difficulty}`);
    if (minDuration) filters.push(aql`e.duration >= ${parseInt(minDuration)}`);
    if (maxDuration) filters.push(aql`e.duration <= ${parseInt(maxDuration)}`);

    const filterAql = buildFilterAql(filters);

    const sortAql = aql`SORT e[${sortBy}] ${sortOrder === 'ASC' ? aql`ASC` : aql`DESC`}`;

    const cursor = await db.query(aql`
      FOR e IN exercises
      ${filterAql}
      ${sortAql}
      LIMIT ${offset}, ${parseInt(limit)}
      RETURN e
    `);

    const countCursor = await db.query(aql`
      FOR e IN exercises
      ${filterAql}
      COLLECT WITH COUNT INTO total
      RETURN total
    `);

    const exercises = await cursor.all();
    const total = await countCursor.next();

    res.json({
      exercises,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

router.get('/exercises/:id', async (req, res) => {
  try {
    const exercises = db.collection('exercises');
    const exercise = await exercises.document(req.params.id);
    const phases = Array.isArray(exercise.phases) ? sortPhasesByOrder(exercise.phases) : [];
    res.json({ ...exercise, phases });
  } catch (error) {
    if (error.errorNum === 1202) {
      res.status(404).json({ error: 'Exercise not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch exercise' });
    }
  }
});

router.post('/exercises', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, category, difficulty, duration, imageUrl, phases } = req.body;
    const normalizedPhases = Array.isArray(phases)
      ? phases.map((phase, index) => ({
          ...phase,
          order: index
        }))
      : [];

    const exercises = db.collection('exercises');
    const result = await exercises.save({
      title,
      description,
      category,
      difficulty,
      duration: parseInt(duration),
      imageUrl: imageUrl || '',
      phases: normalizedPhases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ id: result._key, ...req.body });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

router.put('/exercises/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, description, category, difficulty, duration, imageUrl, phases } = req.body;
    const normalizedPhases = Array.isArray(phases)
      ? phases.map((phase, index) => ({
          ...phase,
          order: index
        }))
      : [];

    const exercises = db.collection('exercises');
    const updated = await exercises.update(req.params.id, {
      title,
      description,
      category,
      difficulty,
      duration: parseInt(duration),
      imageUrl,
      phases: normalizedPhases,
      updatedAt: new Date().toISOString()
    }, { returnNew: true });

    res.json(updated.new);
  } catch (error) {
    if (error.errorNum === 1202) {
      res.status(404).json({ error: 'Exercise not found' });
    } else {
      res.status(500).json({ error: 'Failed to update exercise' });
    }
  }
});

router.delete('/exercises/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const exercises = db.collection('exercises');
    await exercises.remove(req.params.id);

    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    if (error.errorNum === 1202) {
      res.status(404).json({ error: 'Exercise not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete exercise' });
    }
  }
});

router.get('/comments', async (req, res) => {
  try {
    const { exerciseId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const filterAql = exerciseId ? aql`FILTER c.exerciseId == ${exerciseId}` : aql``;

    const cursor = await db.query(aql`
      FOR c IN comments
      ${filterAql}
      SORT c.createdAt DESC
      LIMIT ${offset}, ${parseInt(limit)}
      LET user = DOCUMENT(CONCAT('users/', c.userId))
      RETURN MERGE(c, { username: user.username })
    `);

    const comments = await cursor.all();
    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const { exerciseId, text } = req.body;

    const comments = db.collection('comments');
    const result = await comments.save({
      exerciseId,
      userId: req.user.id,
      text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ id: result._key, ...req.body, userId: req.user.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const { exerciseId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const filterAql = exerciseId ? aql`FILTER r.exerciseId == ${exerciseId}` : aql``;

    const cursor = await db.query(aql`
      FOR r IN reviews
      ${filterAql}
      SORT r.createdAt DESC
      LIMIT ${offset}, ${parseInt(limit)}
      LET user = DOCUMENT(CONCAT('users/', r.userId))
      RETURN MERGE(r, { username: user.username })
    `);

    const reviews = await cursor.all();
    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { exerciseId, rating, text } = req.body;

    const reviews = db.collection('reviews');
    const result = await reviews.save({
      exerciseId,
      userId: req.user.id,
      rating: parseInt(rating),
      text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({ id: result._key, ...req.body, userId: req.user.id });
  } catch (error) {
    if (error.errorNum === 1210) {
      return res.status(400).json({ error: 'You can only submit one review per exercise' });
    }
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 10,
      username,
      email,
      role,
      firstName,
      lastName,
      createdFrom,
      createdTo
    } = req.query;

    if (createdFrom && !isValidDateOnly(createdFrom)) {
      return res.status(400).json({ error: 'Invalid createdFrom format. Use YYYY-MM-DD.' });
    }

    if (createdTo && !isValidDateOnly(createdTo)) {
      return res.status(400).json({ error: 'Invalid createdTo format. Use YYYY-MM-DD.' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const filters = [];

    if (username) filters.push(aql`LIKE(LOWER(u.username), ${`%${username.toLowerCase()}%`}, true)`);
    if (email) filters.push(aql`LIKE(LOWER(u.email), ${`%${email.toLowerCase()}%`}, true)`);
    if (role) filters.push(aql`u.role == ${role}`);
    if (firstName) filters.push(aql`LIKE(LOWER(u.firstName), ${`%${firstName.toLowerCase()}%`}, true)`);
    if (lastName) filters.push(aql`LIKE(LOWER(u.lastName), ${`%${lastName.toLowerCase()}%`}, true)`);
    if (createdFrom) filters.push(aql`u.createdAt >= ${`${createdFrom}T00:00:00.000Z`}`);
    if (createdTo) filters.push(aql`u.createdAt <= ${`${createdTo}T23:59:59.999Z`}`);

    const filterAql = buildFilterAql(filters);

    const cursor = await db.query(aql`
      FOR u IN users
      ${filterAql}
      SORT u.createdAt DESC
      LIMIT ${offset}, ${parseInt(limit)}
      RETURN MERGE(UNSET(u, 'password'), { id: u._key })
    `);

    const countCursor = await db.query(aql`
      FOR u IN users
      ${filterAql}
      COLLECT WITH COUNT INTO total
      RETURN total
    `);

    const users = await cursor.all();
    const total = await countCursor.next();

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    const users = db.collection('users');
    const user = await users.document(req.params.id);

    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, id: user._key });
  } catch (error) {
    if (error.errorNum === 1202) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
});

router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { exerciseId, duration, completed } = req.body;

    const sessions = db.collection('user_sessions');
    const result = await sessions.save({
      userId: req.user.id,
      exerciseId,
      duration: parseInt(duration),
      completed: completed || false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: result._key, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const {
      groupByX,
      groupByY,
      category,
      difficulty,
      minDuration,
      maxDuration,
      userId,
      day,
      dateFrom,
      dateTo
    } = req.query;

    if (day && !isValidDateOnly(day)) {
      return res.status(400).json({ error: 'Invalid day format. Use YYYY-MM-DD.' });
    }

    if (dateFrom && !isValidDateOnly(dateFrom)) {
      return res.status(400).json({ error: 'Invalid dateFrom format. Use YYYY-MM-DD.' });
    }

    if (dateTo && !isValidDateOnly(dateTo)) {
      return res.status(400).json({ error: 'Invalid dateTo format. Use YYYY-MM-DD.' });
    }

    const filters = [];
    if (category) filters.push(aql`e.category == ${category}`);
    if (difficulty) filters.push(aql`e.difficulty == ${difficulty}`);
    if (minDuration) filters.push(aql`e.duration >= ${parseInt(minDuration)}`);
    if (maxDuration) filters.push(aql`e.duration <= ${parseInt(maxDuration)}`);
    if (userId) filters.push(aql`s.userId == ${userId}`);
    if (day) filters.push(aql`DATE_FORMAT(s.createdAt, '%Y-%m-%d') == ${day}`);
    if (dateFrom) filters.push(aql`s.createdAt >= ${`${dateFrom}T00:00:00.000Z`}`);
    if (dateTo) filters.push(aql`s.createdAt <= ${`${dateTo}T23:59:59.999Z`}`);

    const filterAql = buildFilterAql(filters);

    const groupExpression = (field) => {
      if (field === 'day') return aql`DATE_FORMAT(s.createdAt, '%Y-%m-%d')`;
      if (field === 'category') return aql`e.category`;
      if (field === 'difficulty') return aql`e.difficulty`;
      if (field === 'duration') return aql`e.duration`;
      if (field === 'user') return aql`u.username`;
      if (field === 'exercise') return aql`e.title`;
      return aql`null`;
    };

    const xExpr = groupExpression(groupByX);
    const yExpr = groupExpression(groupByY);
    const needsUserDocument = groupByX === 'user' || groupByY === 'user';
    const userJoinAql = needsUserDocument ? aql`LET u = DOCUMENT(CONCAT('users/', s.userId))` : aql``;

    let query;
    if (groupByX && groupByY) {
      query = aql`
        FOR s IN user_sessions
        LET e = DOCUMENT(CONCAT('exercises/', s.exerciseId))
        ${userJoinAql}
        ${filterAql}
        COLLECT x = ${xExpr}, y = ${yExpr} WITH COUNT INTO count
        RETURN { x, y, count }
      `;
    } else if (groupByX) {
      query = aql`
        FOR s IN user_sessions
        LET e = DOCUMENT(CONCAT('exercises/', s.exerciseId))
        ${userJoinAql}
        ${filterAql}
        COLLECT x = ${xExpr} WITH COUNT INTO count
        RETURN { x, count }
      `;
    } else {
      query = aql`
        FOR s IN user_sessions
        LET e = DOCUMENT(CONCAT('exercises/', s.exerciseId))
        ${userJoinAql}
        ${filterAql}
        COLLECT WITH COUNT INTO total
        RETURN { total }
      `;
    }

    const cursor = await db.query(query);
    const statistics = await cursor.all();

    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

router.get('/export', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const collections = ['users', 'exercises', 'comments', 'reviews', 'user_sessions'];
    const data = {};

    for (const collectionName of collections) {
      const cursor = await db.query(aql`FOR doc IN ${db.collection(collectionName)} RETURN doc`);
      data[collectionName] = await cursor.all();
    }

    const edges = ['user_favorites'];
    for (const edgeName of edges) {
      const cursor = await db.query(aql`FOR edge IN ${db.collection(edgeName)} RETURN edge`);
      data[edgeName] = await cursor.all();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=breathing_exercises_export.json');
    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.post('/import', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const data = req.body;

    const collections = ['users', 'exercises', 'comments', 'reviews', 'user_sessions'];
    const edges = ['user_favorites'];

    for (const collectionName of collections) {
      if (data[collectionName] && Array.isArray(data[collectionName])) {
        const collection = db.collection(collectionName);
        await collection.truncate();
        for (const doc of data[collectionName]) {
          await collection.save(doc);
        }
      }
    }

    for (const edgeName of edges) {
      if (data[edgeName] && Array.isArray(data[edgeName])) {
        const collection = db.collection(edgeName);
        await collection.truncate();
        for (const edge of data[edgeName]) {
          await collection.save(edge);
        }
      }
    }

    res.json({ message: 'Data imported successfully' });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;
