-- Pending Students (for email verification)
CREATE TABLE IF NOT EXISTS users_pending (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashpass VARCHAR(255) NOT NULL,
  student_id VARCHAR(64) UNIQUE,  -- Required for student accounts
  course VARCHAR(100),
  department VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Student', -- Always Student here
  token VARCHAR(255) NOT NULL,
  expiresat DATETIME NOT NULL,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
