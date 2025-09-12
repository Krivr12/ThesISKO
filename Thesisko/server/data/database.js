import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables from config.env
dotenv.config({ path: './config.env' });

// Validate required environment variables early
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT']
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name])
if (missingEnvVars.length > 0) {
  console.warn(`Missing database env vars: ${missingEnvVars.join(', ')}. Check your .env file`)
}

// Ensure port is a number and provide a safe default in dev
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connected successfully.');
    connection.release();
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    // Do not exit; keep server running so routes can respond with helpful errors
    return null;
  }
};

export { pool, connectDB };
