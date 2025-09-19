CREATE TABLE IF NOT EXISTS users_tokens (
  token_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  purpose ENUM('verify_email', 'reset_password', 'session') NOT NULL,
  expiresat DATETIME NOT NULL,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_info(user_id) ON DELETE CASCADE
);
