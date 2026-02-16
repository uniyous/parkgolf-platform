import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AccountDeletionService } from './account-deletion.service';
import { UserNatsController } from './user-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [UserNatsController],
    providers: [UserService, AccountDeletionService],
    exports: [UserService, AccountDeletionService],
})
export class UserModule {}