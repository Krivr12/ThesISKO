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

// Flexible user interface that can handle both client-side and server-side user data
export interface User {
    // Core identification
    id?: string;
    user_id?: string;
    StudentID?: string;
    
    // Names (support both client and server naming conventions)
    firstname?: string;
    lastname?: string;
    Firstname?: string;
    Lastname?: string;
    
    // Contact
    email?: string;
    Email?: string;
    
    // Authentication
    password?: string;
    student_id?: string;
    faculty_id?: string;
    
    // Academic info
    department?: string;
    Department?: string;
    course?: string;
    Course?: string;
    
    // Status and role
    status?: string;
    Status?: string;
    role_id?: number;
    
    // Additional info
    AvatarUrl?: string;
    avatar_url?: string;
}
