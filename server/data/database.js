import pkg from 'pg';
const { Pool } = pkg;

// Supabase PostgreSQL connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Reduced pool size to avoid connection limits
  max: 2, // Maximum number of clients in the pool
  min: 0, // Minimum number of clients in the pool
  // Increased timeouts to prevent premature disconnections
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds
  // Add keep-alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

// Handle pool errors more gracefully
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  // Don't exit the process, just log the error
  console.log('🔄 Pool error handled, continuing...');
  // process.exit(-1); // Commented out to prevent server crashes
});

// Handle client errors
pool.on('connect', (client) => {
  console.log('🔗 New client connected to database');
});

pool.on('remove', (client) => {
  console.log('🔌 Client removed from pool');
});

// Test the connection with retry logic
const testConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('✅ Supabase PostgreSQL connected successfully');
      client.release();
      return;
    } catch (error) {
      console.error(`❌ Database connection failed (${4 - retries}/3):`, error.message);
      retries--;
      if (retries > 0) {
        console.log('🔄 Retrying connection in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ Failed to connect to database after 3 attempts');
        console.log('🔄 Server will continue - database will be available when needed');
        // Don't exit the process, let the server start and handle errors gracefully
      }
    }
  }
};

// Test connection on startup (disabled for now)
// testConnection().catch(error => {
//   console.log('⚠️ Initial database connection failed, but server will continue...');
//   console.log('🔄 Database will be available when first query is made');
//   console.log('💡 This is normal - connection will work when needed');
// });

// Graceful shutdown (disabled for now to prevent server crashes)
// process.on('SIGINT', async () => {
//   console.log('🛑 Shutting down database pool...');
//   await pool.end();
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   console.log('🛑 Shutting down database pool...');
//   await pool.end();
//   process.exit(0);
// });

export default pool;
