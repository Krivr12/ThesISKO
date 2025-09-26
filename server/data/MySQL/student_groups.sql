CREATE TABLE student_groups ( 
    group_id VARCHAR(20) PRIMARY KEY, -- e.g. 'G1', 'G2'
    leader_id VARCHAR(64) NOT NULL,   -- must match users_info(student_id)
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,   -- hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES users_info(student_id)
);
