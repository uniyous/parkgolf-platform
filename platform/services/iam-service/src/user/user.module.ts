import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AccountDeletionService } from './account-deletion.service';
import { UserNatsController } from './user-nats.controller';

@Module({
    imports: [],
    controllers: [UserNatsController],
    providers: [UserService, AccountDeletionService],
    exports: [UserService, AccountDeletionService],
})
export class UserModule {}