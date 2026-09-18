const { pool } = require('./index');

const createTables = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(queryText);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
};

const dropTables = async () => {
  const queryText = `
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS users;
  `;

  try {
    await pool.query(queryText);
    console.log('Database tables dropped successfully');
  } catch (err) {
    console.error('Error dropping tables:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  const action = process.argv[2];
  if (action === 'drop') {
    dropTables().then(() => process.exit(0));
  } else {
    createTables().then(() => process.exit(0));
  }
}

module.exports = { createTables, dropTables };
