const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// POST /api/admin/init
// Secured by ADMIN_INIT_TOKEN (set as env var)
router.post('/init', async (req, res) => {
  const provided = req.headers['x-admin-token'] || req.body?.token;
  if (!process.env.ADMIN_INIT_TOKEN || provided !== process.env.ADMIN_INIT_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    return res.json({ ok: true, message: 'Database initialized' });
  } catch (err) {
    console.error('Error running init via /api/admin/init:', err);
    return res.status(500).json({ error: err.message || 'Init failed' });
  }
});

// POST /api/admin/migrate
// Run migration to add quiz modes
router.post('/migrate', async (req, res) => {
  const provided = req.headers['x-admin-token'] || req.body?.token;
  if (!process.env.ADMIN_INIT_TOKEN || provided !== process.env.ADMIN_INIT_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const migrationPath = path.join(__dirname, '..', 'models', 'add_quiz_modes.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(migration);
    return res.json({ ok: true, message: 'Migration completed successfully' });
  } catch (err) {
    console.error('Error running migration:', err);
    return res.status(500).json({ error: err.message || 'Migration failed' });
  }
});

module.exports = router;
