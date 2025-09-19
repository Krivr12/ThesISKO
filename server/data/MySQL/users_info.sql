create table if not exists users_info (
  user_id int auto_increment primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  google_id varchar(255),
  role_id int not null,  -- link to roles
  firstname varchar(100) not null,
  lastname varchar(100) not null,
  department_id int,
  course_id int,
  student_id varchar(64) unique,
  faculty_id varchar(64) unique,
  admin_id varchar(64) unique,
  group_id varchar(50),
  block_id varchar(20),
  avatar_url varchar(500),
  created_at timestamp default current_timestamp,

  foreign key (role_id) references roles(role_id)
    on delete restrict
    on update cascade,
  foreign key (department_id) references departments(department_id) on delete set null,
  foreign key (course_id) references courses(course_id) on delete set null
);
