const app = require('./app');
const { pool } = require('./db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Validate database connection before starting
    await pool.query('SELECT 1');
    console.log('Database connected successfully.');
    
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to the database. Exiting...', err);
    process.exit(1);
  }
};

startServer();
