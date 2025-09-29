import pkg from 'pg';
const { Pool } = pkg;

let pgPool = null;

// Create database pool lazily to ensure environment variables are loaded
function getPool() {
  if (!pgPool) {
    console.log('🗄️ Creating Supabase PostgreSQL Connection Pool:');
    
    // Use connection string if available, otherwise use individual parameters
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'postgres'}`;
    
    console.log('🔗 Connection String:', connectionString.replace(/:([^:@]+)@/, ':***@')); // Hide password in logs
    
    // Try individual parameters to handle IPv6 issues
    pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Increased timeout
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      }
    });

    // Test the connection
    console.log('🔍 Testing Supabase PostgreSQL connection...');
    pgPool.connect()
      .then(client => {
        console.log('✅ SUCCESS: Connected to Supabase PostgreSQL database!');
        console.log('📊 Database:', process.env.DB_NAME);
        console.log('🌐 Host:', process.env.DB_HOST);
        console.log('👤 User:', process.env.DB_USER);
        client.release();
      })
      .catch(err => {
        console.error('❌ FAILED: Supabase connection error:', err.message);
        console.error('🔧 Check your database credentials in config.env');
      });
  }
  return pgPool;
}

// PostgreSQL uses query() instead of execute(), so we need to adapt the interface
const pool = {
  execute: async (sql, params = []) => {
    const client = getPool();
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, $3 format
    let convertedSql = sql;
    let paramIndex = 1;
    convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    const result = await client.query(convertedSql, params);
    return [result.rows]; // Return in MySQL format [rows, fields]
  },
  getConnection: async () => {
    const client = await getPool().connect();
    return {
      execute: async (sql, params = []) => {
        // Convert MySQL ? placeholders to PostgreSQL $1, $2, $3 format
        let convertedSql = sql;
        let paramIndex = 1;
        convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
        
        const result = await client.query(convertedSql, params);
        return [result.rows];
      },
      commit: async () => {
        await client.query('COMMIT');
      },
      rollback: async () => {
        await client.query('ROLLBACK');
      },
      release: () => {
        client.release();
      }
    };
  },
  query: async (sql, params = []) => {
    const client = getPool();
    return await client.query(sql, params);
  },
  connect: async () => {
    const client = await getPool().connect();
    return client;
  },
  end: async () => {
    if (pgPool) {
      await getPool().end();
    }
  }
};

export default pool;
