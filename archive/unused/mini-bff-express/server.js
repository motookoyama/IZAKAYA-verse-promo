const express = require('express');
const app = express();
app.use(express.json());

// In-memory points database
let pointsDB = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Ensure user entry exists
function ensureUser(user) {
  if (!pointsDB[user]) {
    pointsDB[user] = { points: 100, last_reset: getToday() };
  }
}

// GET /api/points?user=guest
app.get('/api/points', (req, res) => {
  const user = req.query.user || 'guest';
  ensureUser(user);
  res.json(pointsDB[user]);
});

// POST /api/points { user, delta }
app.post('/api/points', (req, res) => {
  const { user = 'guest', delta = -10 } = req.body;
  ensureUser(user);
  pointsDB[user].points += delta;
  if (pointsDB[user].points < 0) pointsDB[user].points = 0;
  res.json(pointsDB[user]);
});

// Admin endpoints
// GET /api/admin/points?user=target
app.get('/api/admin/points', (req, res) => {
  const user = req.query.user || 'guest';
  ensureUser(user);
  res.json(pointsDB[user]);
});

// POST /api/admin/points { targetUser, amount }
app.post('/api/admin/points', (req, res) => {
  const { targetUser = 'guest', amount = 0 } = req.body;
  ensureUser(targetUser);
  pointsDB[targetUser].points += amount;
  res.json(pointsDB[targetUser]);
});

// Session endpoint
// GET /api/session?user=guest&character=charName
app.get('/api/session', (req, res) => {
  const user = req.query.user || 'guest';
  const character = req.query.character || '';
  ensureUser(user);
  res.json({ user, character, points: pointsDB[user].points });
});

// Listen on specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Mini BFF running on port', PORT);
});
