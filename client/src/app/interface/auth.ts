export interface signupPostData {
    firstname: string;
    lastname: string;
    email: string;
    student_id: string;
    password: string;
    department: string;
    course: string;
    status: string;
}

export interface User extends signupPostData{
    id: string;
}
