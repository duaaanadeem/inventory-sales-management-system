const { Pool } = require("pg");

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
const hasDiscreteConfig = process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER;

const pool = new Pool(databaseUrl ? { connectionString: databaseUrl } : {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

const getConfigurationError = () => {
  if (!databaseUrl && !hasDiscreteConfig) {
    return "PostgreSQL is not configured. Set DATABASE_URL in backend/.env.";
  }

  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      if (!url.hostname || !url.username || !url.password) {
        return "DATABASE_URL must include a host, username, and password.";
      }
    } catch (error) {
      return "DATABASE_URL must be a valid PostgreSQL connection URL.";
    }
  }

  if (hasDiscreteConfig && !process.env.PGPASSWORD) {
    return "PGPASSWORD must be set when using PGHOST/PGDATABASE/PGUSER.";
  }

  return null;
};

const query = async (...args) => {
  const configurationError = getConfigurationError();
  if (configurationError) {
    const error = new Error(configurationError);
    error.statusCode = 503;
    throw error;
  }
  return pool.query(...args);
};

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});


// Transaction helper
const withTransaction = async (callback) => {
  const configurationError = getConfigurationError();
  if (configurationError) {
    const error = new Error(configurationError);
    error.statusCode = 503;
    throw error;
  }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { query, withTransaction };