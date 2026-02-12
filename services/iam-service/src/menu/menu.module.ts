import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuNatsController } from './menu-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MenuNatsController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
