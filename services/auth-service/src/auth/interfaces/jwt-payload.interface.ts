export interface JwtPayload {
    sub: number; // Standard JWT subject claim (user ID)
    email: string;
    roles: string[];
}