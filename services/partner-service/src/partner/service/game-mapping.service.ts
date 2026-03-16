import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGameMappingDto } from '../dto/create-game-mapping.dto';
import { UpdateGameMappingDto } from '../dto/update-game-mapping.dto';
import { AppException, Errors } from '../../common/exceptions';

@Injectable()
export class GameMappingService {
  private readonly logger = new Logger(GameMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGameMappingDto) {
    // 파트너 존재 확인
    const partner = await this.prisma.partnerConfig.findUnique({
      where: { id: dto.partnerId },
    });
    if (!partner) {
      throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    }

    return this.prisma.gameMapping.create({ data: dto });
  }

  async findByPartnerId(partnerId: number) {
    return this.prisma.gameMapping.findMany({
      where: { partnerId },
      include: {
        slotMappings: {
          select: { id: true, externalSlotId: true, date: true, startTime: true, syncStatus: true },
          take: 5,
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { externalCourseName: 'asc' },
    });
  }

  async update(dto: UpdateGameMappingDto) {
    const { id, ...updateData } = dto;

    const existing = await this.prisma.gameMapping.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException(Errors.Partner.COURSE_MAPPING_NOT_FOUND);
    }

    return this.prisma.gameMapping.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    const existing = await this.prisma.gameMapping.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException(Errors.Partner.COURSE_MAPPING_NOT_FOUND);
    }

    await this.prisma.gameMapping.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * 외부 코스명으로 내부 Game ID 찾기 (동기화용)
   */
  async resolveInternalGameId(partnerId: number, externalCourseName: string): Promise<number | null> {
    const mapping = await this.prisma.gameMapping.findUnique({
      where: {
        partnerId_externalCourseName: { partnerId, externalCourseName },
      },
    });

    return mapping?.internalGameId ?? null;
  }
}
