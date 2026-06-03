import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { games, gameWeeklySchedules } from '../../db/schema';
import type { GameWeeklySchedule } from '../../db/schema';
import {
  CreateGameWeeklyScheduleDto,
  UpdateGameWeeklyScheduleDto,
  FindGameWeeklySchedulesQueryDto,
  BulkCreateGameWeeklyScheduleDto,
} from '../dto/game-weekly-schedule.dto';

@Injectable()
export class GameWeeklyScheduleService {
  private readonly logger = new Logger(GameWeeklyScheduleService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(createDto: CreateGameWeeklyScheduleDto): Promise<GameWeeklySchedule> {
    this.logger.log(`Creating weekly schedule for game ${createDto.gameId}, day ${createDto.dayOfWeek}`);

    const [game] = await this.db.select().from(games).where(eq(games.id, createDto.gameId)).limit(1);
    if (!game) {
      throw new NotFoundException(`Game with ID ${createDto.gameId} not found`);
    }

    try {
      const [created] = await this.db
        .insert(gameWeeklySchedules)
        .values({
          gameId: createDto.gameId,
          dayOfWeek: createDto.dayOfWeek,
          startTime: createDto.startTime,
          endTime: createDto.endTime,
          interval: createDto.interval ?? 10,
          isActive: createDto.isActive ?? true,
        })
        .returning();

      return this.db.query.gameWeeklySchedules.findFirst({
        where: eq(gameWeeklySchedules.id, created.id),
        with: { game: true },
      });
    } catch (error) {
      if (error?.code === '23505') {
        throw new ConflictException(
          `Weekly schedule for game ${createDto.gameId} on day ${createDto.dayOfWeek} at ${createDto.startTime} already exists`
        );
      }
      throw error;
    }
  }

  async findAll(query: FindGameWeeklySchedulesQueryDto): Promise<GameWeeklySchedule[]> {
    const { gameId, dayOfWeek, isActive } = query;

    const conditions = [];
    if (gameId) conditions.push(eq(gameWeeklySchedules.gameId, gameId));
    if (dayOfWeek !== undefined) conditions.push(eq(gameWeeklySchedules.dayOfWeek, dayOfWeek));
    if (isActive !== undefined) conditions.push(eq(gameWeeklySchedules.isActive, isActive));

    return this.db.query.gameWeeklySchedules.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [asc(gameWeeklySchedules.gameId), asc(gameWeeklySchedules.dayOfWeek), asc(gameWeeklySchedules.startTime)],
      with: {
        game: true,
      },
    });
  }

  async findOne(id: number): Promise<GameWeeklySchedule> {
    const schedule = await this.db.query.gameWeeklySchedules.findFirst({
      where: eq(gameWeeklySchedules.id, id),
      with: {
        game: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`GameWeeklySchedule with ID ${id} not found`);
    }

    return schedule;
  }

  async findByGame(gameId: number): Promise<GameWeeklySchedule[]> {
    return this.db.query.gameWeeklySchedules.findMany({
      where: and(eq(gameWeeklySchedules.gameId, gameId), eq(gameWeeklySchedules.isActive, true)),
      orderBy: [asc(gameWeeklySchedules.dayOfWeek), asc(gameWeeklySchedules.startTime)],
    });
  }

  async update(id: number, updateDto: UpdateGameWeeklyScheduleDto): Promise<GameWeeklySchedule> {
    this.logger.log(`Updating GameWeeklySchedule with ID: ${id}`);

    await this.findOne(id);

    await this.db
      .update(gameWeeklySchedules)
      .set({
        startTime: updateDto.startTime,
        endTime: updateDto.endTime,
        interval: updateDto.interval,
        isActive: updateDto.isActive,
      })
      .where(eq(gameWeeklySchedules.id, id));

    return this.db.query.gameWeeklySchedules.findFirst({
      where: eq(gameWeeklySchedules.id, id),
      with: {
        game: true,
      },
    });
  }

  async remove(id: number): Promise<GameWeeklySchedule> {
    this.logger.log(`Deleting GameWeeklySchedule with ID: ${id}`);

    await this.findOne(id);

    const [deleted] = await this.db
      .delete(gameWeeklySchedules)
      .where(eq(gameWeeklySchedules.id, id))
      .returning();

    return deleted;
  }

  async bulkCreate(dto: BulkCreateGameWeeklyScheduleDto): Promise<{ created: number }> {
    this.logger.log(`Bulk creating weekly schedules for game ${dto.gameId}`);

    const [game] = await this.db.select().from(games).where(eq(games.id, dto.gameId)).limit(1);
    if (!game) {
      throw new NotFoundException(`Game with ID ${dto.gameId} not found`);
    }

    const daysToCreate = dto.includeWeekend
      ? [0, 1, 2, 3, 4, 5, 6] // 일~토
      : [1, 2, 3, 4, 5]; // 월~금

    const schedulesToCreate = daysToCreate.map(dayOfWeek => ({
      gameId: dto.gameId,
      dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      interval: dto.interval ?? 10,
      isActive: true,
    }));

    const result = await this.db
      .insert(gameWeeklySchedules)
      .values(schedulesToCreate)
      .onConflictDoNothing()
      .returning();

    return { created: result.length };
  }

  async removeByGame(gameId: number): Promise<{ deleted: number }> {
    this.logger.log(`Deleting all weekly schedules for game ${gameId}`);

    const result = await this.db
      .delete(gameWeeklySchedules)
      .where(eq(gameWeeklySchedules.gameId, gameId))
      .returning();

    return { deleted: result.length };
  }
}
