import { Injectable, Logger } from '@nestjs/common';
import { eq, and, asc, desc } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { partnerConfigs, gameMappings, slotMappings } from '../../db/schema';
import { CreateGameMappingDto } from '../dto/create-game-mapping.dto';
import { UpdateGameMappingDto } from '../dto/update-game-mapping.dto';
import { AppException, Errors } from '../../common/exceptions';

@Injectable()
export class GameMappingService {
  private readonly logger = new Logger(GameMappingService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(dto: CreateGameMappingDto) {
    const [partner] = await this.db.select().from(partnerConfigs).where(eq(partnerConfigs.id, dto.partnerId)).limit(1);
    if (!partner) throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);

    const [row] = await this.db.insert(gameMappings).values(dto).returning();
    return row;
  }

  async findByPartnerId(partnerId: number) {
    return this.db.query.gameMappings.findMany({
      where: eq(gameMappings.partnerId, partnerId),
      orderBy: asc(gameMappings.externalCourseName),
      with: {
        slotMappings: {
          columns: { id: true, externalSlotId: true, date: true, startTime: true, syncStatus: true },
          orderBy: desc(slotMappings.date),
          limit: 5,
        },
      },
    });
  }

  async update(dto: UpdateGameMappingDto) {
    const { id, ...updateData } = dto;
    const [existing] = await this.db.select().from(gameMappings).where(eq(gameMappings.id, id)).limit(1);
    if (!existing) throw new AppException(Errors.Partner.COURSE_MAPPING_NOT_FOUND);

    const [row] = await this.db.update(gameMappings).set(updateData as Partial<typeof gameMappings.$inferInsert>).where(eq(gameMappings.id, id)).returning();
    return row;
  }

  async delete(id: number) {
    const [existing] = await this.db.select().from(gameMappings).where(eq(gameMappings.id, id)).limit(1);
    if (!existing) throw new AppException(Errors.Partner.COURSE_MAPPING_NOT_FOUND);
    await this.db.delete(gameMappings).where(eq(gameMappings.id, id));
    return { deleted: true };
  }

  async resolveInternalGameId(partnerId: number, externalCourseName: string): Promise<number | null> {
    const [mapping] = await this.db
      .select()
      .from(gameMappings)
      .where(and(eq(gameMappings.partnerId, partnerId), eq(gameMappings.externalCourseName, externalCourseName)))
      .limit(1);
    return mapping?.internalGameId ?? null;
  }
}
