const app = require('./app');
const { pool } = require('./db');
const { createTables } = require('./db/init');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Validate database connection before starting
    await pool.query('SELECT 1');
    console.log('Database connected successfully.');
    
    // Ensure database tables exist
    await createTables();

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to the database. Exiting...', err);
    process.exit(1);
  }
};

startServer();
