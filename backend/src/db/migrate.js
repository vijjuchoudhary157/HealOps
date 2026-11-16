const { pool } = require('./index');

const runMigration = async () => {
  const queryText = `
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
  `;

  try {
    await pool.query(queryText);
    console.log('Incident management migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
};

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
