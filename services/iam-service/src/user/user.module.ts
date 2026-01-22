import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserNatsController } from './user-nats.controller';
// PrismaModule is global, so no need to import if PrismaService is directly injected
// If PrismaModule is not global, uncomment and import:
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [UserNatsController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}