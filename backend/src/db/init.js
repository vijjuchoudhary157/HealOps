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

    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      fingerprint VARCHAR(255) NOT NULL,
      alertname VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'firing',
      severity VARCHAR(50) NOT NULL DEFAULT 'warning',
      summary TEXT,
      description TEXT,
      labels JSONB NOT NULL DEFAULT '{}'::jsonb,
      annotations JSONB NOT NULL DEFAULT '{}'::jsonb,
      first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_incidents_fingerprint ON incidents(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);

    CREATE TABLE IF NOT EXISTS incident_events (
      id SERIAL PRIMARY KEY,
      incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      summary TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_incident_events_incident_id ON incident_events(incident_id);
    CREATE INDEX IF NOT EXISTS idx_incident_events_created_at ON incident_events(created_at DESC);

    CREATE TABLE IF NOT EXISTS incident_analyses (
      id SERIAL PRIMARY KEY,
      incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      analysis_type VARCHAR(50) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      model VARCHAR(100),
      probable_root_cause TEXT NOT NULL,
      explanation TEXT NOT NULL,
      evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
      recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
      confidence VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'completed',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_incident_analyses_incident_id ON incident_analyses(incident_id);
    CREATE INDEX IF NOT EXISTS idx_incident_analyses_created_at ON incident_analyses(created_at DESC);
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
    DROP TABLE IF EXISTS incident_analyses;
    DROP TABLE IF EXISTS incident_events;
    DROP TABLE IF EXISTS incidents;
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
