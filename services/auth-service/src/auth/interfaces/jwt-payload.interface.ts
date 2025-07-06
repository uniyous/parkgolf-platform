import { Role } from '@prisma/client';

export interface JwtPayload {
    sub: number; // Standard JWT subject claim (user ID)
    username: string;
    email: string;
    roles: Role[];
}