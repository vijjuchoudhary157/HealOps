const { pool } = require('../db');

const getHealth = (req, res) => {
  res.json({
    status: 'healthy',
    service: 'healops-backend',
    timestamp: new Date().toISOString()
  });
};

const getReady = async (req, res, next) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
};

module.exports = {
  getHealth,
  getReady
};
