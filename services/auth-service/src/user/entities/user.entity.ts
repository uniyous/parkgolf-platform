import { ApiProperty } from '@nestjs/swagger';
import { User as PrismaUser} from '@prisma/client';

export class UserEntity implements Omit<PrismaUser, 'password'> {
    @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
    id: number;

    @ApiProperty({ example: 'user@example.com', description: 'The email address of the user' })
    email: string;

    @ApiProperty({ example: 'John Doe', description: 'The full name of the user', required: false })
    name: string | null;

    // Password should NOT be exposed
    // password!: string;

    @ApiProperty({ example: 'USER', description: 'Role of the user' })
    roleCode: string;

    @ApiProperty({ example: true, description: 'Whether the user is active' })
    isActive: boolean;

    @ApiProperty({ example: '2023-10-27T10:00:00.000Z', description: 'User creation timestamp' })
    createdAt: Date;

    @ApiProperty({ example: '2023-10-27T10:00:00.000Z', description: 'User last update timestamp' })
    updatedAt: Date;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }
}