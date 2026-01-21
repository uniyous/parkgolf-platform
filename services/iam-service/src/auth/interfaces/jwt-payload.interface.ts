export interface JwtPayload {
    sub: number; // Standard JWT subject claim (user ID)
    email: string;
    roles: string[];
    type: 'user' | 'admin';
}

export interface AdminJwtPayload {
    sub: number;
    email: string;
    roles: string[];
    type: 'admin';
}

export interface UserJwtPayload {
    sub: number;
    email: string;
    name?: string;
    roles: string[];
    type: 'user';
}