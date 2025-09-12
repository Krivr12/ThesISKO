export interface signupPostData {
    firstName: string;
    lastName: string;
    email: string;
    studentNum: string;
    password: string;
    department: string;
    course: string;
    status: string;
}

export interface User {
    StudentID: number;
    Firstname: string;
    Lastname: string;
    Email: string;
    Status: string;
    Course?: string;
    Department?: string;
    student_id?: string;
    faculty_id?: string;
    admin_id?: string;
    AvatarUrl?: string;
}

export interface LoginResponse {
    message: string;
    user: User;
}
