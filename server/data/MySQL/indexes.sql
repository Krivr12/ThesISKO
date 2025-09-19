create index idx_users_pending_token on users_pending(token);
create index idx_users_info_google_id on users_info(google_id);
create index idx_users_info_department_id on users_info(department_id);
create index idx_users_info_course_id on users_info(course_id);
create index idx_users_tokens_token on users_tokens(token);
