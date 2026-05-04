import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { aql } from 'arangojs';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const createHttpError = (statusCode, message) => new HttpError(statusCode, message);

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const withRouteContext = (context) => (req, res, next) => {
  req.errorContext = context;
  next();
};

const requireRole = (role, message = 'Access denied') => (req, res, next) => {
  if (req.user?.role !== role) {
    return next(createHttpError(403, message));
  }

  return next();
};

const requireAdmin = requireRole('admin', 'Admin access required');
const requireAdminOrSelf = (req, res, next) => {
  if (req.user?.role === 'admin' || String(req.user?.id) === String(req.params.id)) {
    return next();
  }

  return next(createHttpError(403, 'Access denied'));
};

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

// This function is serialized and executed by ArangoDB inside a transaction.
// params = { data, collections, edges }; db._collection is required in DB-side transaction code.
const importDataTransaction = function (params) {
  const names = [...params.collections, ...params.edges];

  for (const name of names) {
    const docs = params.data[name];

    if (Array.isArray(docs)) {
      const collection = db._collection(name);
      collection.truncate();

      for (const doc of docs) {
        collection.save(doc);
      }
    }
  }

  return true;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    return next();
  });
};

router.post('/auth/register', withRouteContext({ defaultMessage: 'Registration failed' }), asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  if (!username || !email || !password) {
    throw createHttpError(400, 'Username, email and password are required');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const users = db.collection('users');

  let result;
  try {
    result = await users.save({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error.errorNum === 1210) {
      throw createHttpError(400, 'Username or email already exists');
    }

    throw error;
  }

  const token = jwt.sign({ id: result._key, username, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: result._key, username, email, role: 'user' } });
}));

router.post('/auth/login', withRouteContext({ defaultMessage: 'Login failed', logMessage: 'Login error:' }), asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const cursor = await db.query(aql`
    FOR u IN users
    FILTER u.username == ${username} OR u.email == ${username}
    RETURN u
  `);

  const user = await cursor.next();

  if (!user) {
    throw createHttpError(401, 'Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    throw createHttpError(401, 'Invalid credentials');
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
}));

router.get('/exercises', withRouteContext({ defaultMessage: 'Failed to fetch exercises', logMessage: 'Error fetching exercises:' }), asyncHandler(async (req, res) => {
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
}));

router.get('/exercises/:id', withRouteContext({ defaultMessage: 'Failed to fetch exercise' }), asyncHandler(async (req, res) => {
  const exercises = db.collection('exercises');

  let exercise;
  try {
    exercise = await exercises.document(req.params.id);
  } catch (error) {
    if (error.errorNum === 1202) {
      throw createHttpError(404, 'Exercise not found');
    }

    throw error;
  }

  const phases = Array.isArray(exercise.phases) ? sortPhasesByOrder(exercise.phases) : [];
  res.json({ ...exercise, phases });
}));

router.post('/exercises', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to create exercise', logMessage: 'Error creating exercise:' }), asyncHandler(async (req, res) => {
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
}));

router.put('/exercises/:id', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to update exercise' }), asyncHandler(async (req, res) => {
  const { title, description, category, difficulty, duration, imageUrl, phases } = req.body;
  const normalizedPhases = Array.isArray(phases)
    ? phases.map((phase, index) => ({
        ...phase,
        order: index
      }))
    : [];

  const exercises = db.collection('exercises');

  let updated;
  try {
    updated = await exercises.update(req.params.id, {
      title,
      description,
      category,
      difficulty,
      duration: parseInt(duration),
      imageUrl,
      phases: normalizedPhases,
      updatedAt: new Date().toISOString()
    }, { returnNew: true });
  } catch (error) {
    if (error.errorNum === 1202) {
      throw createHttpError(404, 'Exercise not found');
    }

    throw error;
  }

  res.json(updated.new);
}));

router.delete('/exercises/:id', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to delete exercise' }), asyncHandler(async (req, res) => {
  const exercises = db.collection('exercises');

  try {
    await exercises.remove(req.params.id);
  } catch (error) {
    if (error.errorNum === 1202) {
      throw createHttpError(404, 'Exercise not found');
    }

    throw error;
  }

  res.json({ message: 'Exercise deleted successfully' });
}));

router.get('/comments', withRouteContext({ defaultMessage: 'Failed to fetch comments', logMessage: 'Error fetching comments:' }), asyncHandler(async (req, res) => {
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
}));

router.post('/comments', authenticateToken, withRouteContext({ defaultMessage: 'Failed to create comment' }), asyncHandler(async (req, res) => {
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
}));

router.get('/reviews', withRouteContext({ defaultMessage: 'Failed to fetch reviews', logMessage: 'Error fetching reviews:' }), asyncHandler(async (req, res) => {
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
}));

router.post('/reviews', authenticateToken, withRouteContext({ defaultMessage: 'Failed to create review' }), asyncHandler(async (req, res) => {
  const { exerciseId, rating, text } = req.body;

  const reviews = db.collection('reviews');

  let result;
  try {
    result = await reviews.save({
      exerciseId,
      userId: req.user.id,
      rating: parseInt(rating),
      text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error.errorNum === 1210) {
      throw createHttpError(400, 'You can only submit one review per exercise');
    }

    throw error;
  }

  res.status(201).json({ id: result._key, ...req.body, userId: req.user.id });
}));

router.get('/users', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to fetch users', logMessage: 'Error fetching users:' }), asyncHandler(async (req, res) => {
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
    throw createHttpError(400, 'Invalid createdFrom format. Use YYYY-MM-DD.');
  }

  if (createdTo && !isValidDateOnly(createdTo)) {
    throw createHttpError(400, 'Invalid createdTo format. Use YYYY-MM-DD.');
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
}));

router.get('/users/:id', authenticateToken, requireAdminOrSelf, withRouteContext({ defaultMessage: 'Failed to fetch user' }), asyncHandler(async (req, res) => {
  const users = db.collection('users');

  let user;
  try {
    user = await users.document(req.params.id);
  } catch (error) {
    if (error.errorNum === 1202) {
      throw createHttpError(404, 'User not found');
    }

    throw error;
  }

  const { password, ...userWithoutPassword } = user;
  res.json({ ...userWithoutPassword, id: user._key });
}));

router.post('/sessions', authenticateToken, withRouteContext({ defaultMessage: 'Failed to create session' }), asyncHandler(async (req, res) => {
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
}));

router.get('/statistics', authenticateToken, withRouteContext({ defaultMessage: 'Failed to fetch statistics', logMessage: 'Error fetching statistics:' }), asyncHandler(async (req, res) => {
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
    throw createHttpError(400, 'Invalid day format. Use YYYY-MM-DD.');
  }

  if (dateFrom && !isValidDateOnly(dateFrom)) {
    throw createHttpError(400, 'Invalid dateFrom format. Use YYYY-MM-DD.');
  }

  if (dateTo && !isValidDateOnly(dateTo)) {
    throw createHttpError(400, 'Invalid dateTo format. Use YYYY-MM-DD.');
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
}));

router.get('/export', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to export data', logMessage: 'Error exporting data:' }), asyncHandler(async (req, res) => {
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
}));

router.post('/import', authenticateToken, requireAdmin, withRouteContext({ defaultMessage: 'Failed to import data', logMessage: 'Error importing data:' }), asyncHandler(async (req, res) => {
  const data = req.body;
  const collections = ['users', 'exercises', 'comments', 'reviews', 'user_sessions'];
  const edges = ['user_favorites'];

  // Atomic import avoids partial state; write locks can block concurrent writes while truncating/refilling collections.
  await db.executeTransaction({
    collections: { write: [...collections, ...edges] },
    // ArangoDB executeTransaction requires a stringified function body.
    action: String(importDataTransaction),
    params: { data, collections, edges }
  });

  res.json({ message: 'Data imported successfully' });
}));

router.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const context = req.errorContext ?? {};
  const fallbackMessage = typeof context.defaultMessage === 'string' && context.defaultMessage.length > 0
    ? context.defaultMessage
    : 'Request failed';

  if (!(error instanceof HttpError) && context.logMessage) {
    console.error(context.logMessage, error);
  }

  const statusCode = error instanceof HttpError && Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;
  const message = error instanceof HttpError && typeof error.message === 'string' && error.message.length > 0
    ? error.message
    : fallbackMessage;

  return res.status(statusCode).json({ error: message });
});

export default router;
