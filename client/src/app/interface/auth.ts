export interface signupPostData {
    firstName: string;
    lastName: string;
    password: string;
}

export interface User extends signupPostData{
    id: string;
}
