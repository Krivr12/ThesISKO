-- Create courses table
create table if not exists courses (
  course_id int auto_increment primary key,
  department_id int not null,
  course_code varchar(20) not null unique,
  course_name varchar(255) not null,
  foreign key (department_id) references departments(department_id) on delete cascade
);

-- Insert courses for each department

-- OUS
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'OUS'), 'DBA', 'DBA'),
((select department_id from departments where code = 'OUS'), 'D.ENG', 'D.ENG'),
((select department_id from departments where code = 'OUS'), 'PHDEM', 'PHDEM'),
((select department_id from departments where code = 'OUS'), 'DPA', 'DPA'),
((select department_id from departments where code = 'OUS'), 'MC', 'MC'),
((select department_id from departments where code = 'OUS'), 'MBA', 'MBA'),
((select department_id from departments where code = 'OUS'), 'MAEM', 'MAEM'),
((select department_id from departments where code = 'OUS'), 'MIT', 'MIT'),
((select department_id from departments where code = 'OUS'), 'MPA', 'MPA');

-- CAF
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'CAF'), 'BSA', 'BSA'),
((select department_id from departments where code = 'CAF'), 'BSBAFM', 'BSBAFM'),
((select department_id from departments where code = 'CAF'), 'BSMA', 'BSMA');

-- CADBE
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'CADBE'), 'BSARCH', 'BSARCH'),
((select department_id from departments where code = 'CADBE'), 'BSID', 'BSID'),
((select department_id from departments where code = 'CADBE'), 'BSEP', 'BSEP');

-- CAL
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'CAL'), 'ABELS', 'ABELS'),
((select department_id from departments where code = 'CAL'), 'ABF', 'ABF'),
((select department_id from departments where code = 'CAL'), 'ABLCS', 'ABLCS'),
((select department_id from departments where code = 'CAL'), 'ABPHILO', 'ABPHILO'),
((select department_id from departments where code = 'CAL'), 'BPEA', 'BPEA');

-- CBA
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'CBA'), 'DBA', 'DBA'),
((select department_id from departments where code = 'CBA'), 'MBA', 'MBA'),
((select department_id from departments where code = 'CBA'), 'BSBAHRM', 'BSBAHRM'),
((select department_id from departments where code = 'CBA'), 'BSBAMM', 'BSBAMM'),
((select department_id from departments where code = 'CBA'), 'BSENTREP', 'BSENTREP'),
((select department_id from departments where code = 'CBA'), 'BSOA', 'BSOA');

-- COC
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'COC'), 'BADPR', 'BADPR'),
((select department_id from departments where code = 'COC'), 'BAB', 'BAB'),
((select department_id from departments where code = 'COC'), 'BACR', 'BACR'),
((select department_id from departments where code = 'COC'), 'BAJ', 'BAJ');

-- CCIS
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where code = 'CCIS'), 'BSCS', 'BSCS'),
((select department_id from departments where code = 'CCIS'), 'BSIT', 'BSIT');

-- COED
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where department_code = 'COED'), 'PHDEM', 'PHDEM'),
((select department_id from departments where department_code = 'COED'), 'MBE', 'MBE'),
((select department_id from departments where department_code = 'COED'), 'MLIS', 'MLIS'),
((select department_id from departments where department_code = 'COED'), 'MAELT', 'MAELT'),
((select department_id from departments where department_code = 'COED'), 'MAEDME', 'MAEDME'),
((select department_id from departments where department_code = 'COED'), 'MAPES', 'MAPES'),
((select department_id from departments where department_code = 'COED'), 'MAEDTCA', 'MAEDTCA'),
((select department_id from departments where department_code = 'COED'), 'PBDE', 'PBDE');

-- CE
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where department_code = 'CE'), 'BSCE', 'BSCE'),
((select department_id from departments where department_code = 'CE'), 'BSCPE', 'BSCPE'),
((select department_id from departments where department_code = 'CE'), 'BSEE', 'BSEE'),
((select department_id from departments where department_code = 'CE'), 'BSECE', 'BSECE'),
((select department_id from departments where department_code= 'CE'), 'BSIE', 'BSIE'),
((select department_id from departments where department_code = 'CE'), 'BSME', 'BSME'),
((select department_id from departments where department_code = 'CE'), 'BSRE', 'BSRE');

-- CHK
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where department_code = 'CHK'), 'BPE', 'BPE'),
((select department_id from departments where department_code = 'CHK'), 'BSESS', 'BSESS');

-- CSSD
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where department_code = 'CSSD'), 'BAH', 'BAH'),
((select department_id from departments where department_code = 'CSSD'), 'BAS', 'BAS'),
((select department_id from departments where department_code = 'CSSD'), 'BSC', 'BSC'),
((select department_id from departments where department_code = 'CSSD'), 'BSE', 'BSE'),
((select department_id from departments where department_code = 'CSSD'), 'BSPSY', 'BSPSY');

-- CS
insert into courses (department_id, course_code, course_name) values
((select department_id from departments where department_code = 'CS'), 'BSFT', 'BSFT'),
((select department_id from departments where department_code = 'CS'), 'BSAPMATH', 'BSAPMATH'),
((select department_id from departments where department_code = 'CS'), 'BSBIO', 'BSBIO'),
((select department_id from departments where department_code = 'CS'), 'BSCHEM', 'BSCHEM'),
((select department_id from departments where department_code = 'CS'), 'BSMATH', 'BSMATH'),
((select department_id from departments where department_code = 'CS'), 'BSND', 'BSND'),
((select department_id from departments where department_code = 'CS'), 'BSPHY', 'BSPHY');
