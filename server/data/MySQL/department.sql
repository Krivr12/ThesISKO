create table departments (
  department_id int auto_increment primary key,
  department_code varchar(10) not null unique,
  department_name varchar(255) not null unique
);

insert into departments ( department_code, department_name) values
('OUS', 'OPEN UNIVERSITY SYSTEM'),
('CAF', 'COLLEGE OF ACCOUNTANCY AND FINANCE'),
('CADBE', 'COLLEGE OF ARCHITECTURE, DESIGN AND THE BUILT ENVIRONMENT'),
('CAL', 'COLLEGE OF ARTS AND LETTERS'),
('CBA', 'COLLEGE OF BUSINESS ADMINISTRATION'),
('COC', 'COLLEGE OF COMMUNICATION'),
('CCIS', 'COLLEGE OF COMPUTER AND INFORMATION SCIENCES'),
('COED', 'COLLEGE OF EDUCATION'),
('CE', 'COLLEGE OF ENGINEERING'),
('CHK', 'COLLEGE OF HUMAN KINETICS'),
('CSSD', 'COLLEGE OF SOCIAL SCIENCES AND DEVELOPMENT'),
('CS', 'COLLEGE OF SCIENCE');
