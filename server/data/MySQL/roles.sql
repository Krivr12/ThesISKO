CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES
  ('guest'),
  ('student'),
  ('faculty'),  
  ('admin'),
  ('superadmin')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);
