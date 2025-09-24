-- Activity Log Table for tracking all user actions
CREATE TABLE IF NOT EXISTS activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT,
    resource_type VARCHAR(100), -- 'thesis', 'user', 'search', etc.
    resource_id VARCHAR(255), -- ID of the resource being acted upon
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_url TEXT,
    request_body JSON, -- Store request data as JSON
    response_status INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSON, -- For storing extra metadata
    
    -- Indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at),
    INDEX idx_resource_type (resource_type),
    
    -- Foreign key constraint (optional, depends on your users table structure)
    FOREIGN KEY (user_id) REFERENCES users_info(user_id) ON DELETE SET NULL
);

-- Specific action types by user role:

-- STUDENT ACTIVITIES:
-- 'student_login', 'student_signup', 'student_logout'
-- 'view_thesis', 'request_thesis', 'search_thesis', 'submit_thesis'

-- GUEST ACTIVITIES:
-- 'guest_google_signin', 'guest_search', 'guest_view_thesis', 'guest_request_thesis', 'guest_logout'

-- FACULTY ACTIVITIES:
-- FIC: 'fic_login', 'fic_logout', 'fic_approve_request', 'fic_reject_request', 'fic_add_groups'
-- PANELIST: 'panelist_login', 'panelist_logout', 'panelist_approve_request', 'panelist_reject_request', 'panelist_comment'

-- ADMIN ACTIVITIES:
-- 'admin_login', 'admin_logout', 'admin_create_faculty', 'admin_approve_capstone', 'admin_reject_capstone', 'admin_approve_request', 'admin_reject_request'
