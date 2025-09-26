CREATE TABLE group_members (
    group_id VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,             -- from users_info(user_id)
    label VARCHAR(50) DEFAULT 'Member',
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES student_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users_info(user_id) ON DELETE CASCADE
);
