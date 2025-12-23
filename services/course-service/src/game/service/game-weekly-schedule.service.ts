import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameWeeklySchedule, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateGameWeeklyScheduleDto,
  UpdateGameWeeklyScheduleDto,
  FindGameWeeklySchedulesQueryDto,
  BulkCreateGameWeeklyScheduleDto,
} from '../dto/game-weekly-schedule.dto';

@Injectable()
export class GameWeeklyScheduleService {
  private readonly logger = new Logger(GameWeeklyScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateGameWeeklyScheduleDto): Promise<GameWeeklySchedule> {
    this.logger.log(`Creating weekly schedule for game ${createDto.gameId}, day ${createDto.dayOfWeek}`);

    const game = await this.prisma.game.findUnique({
      where: { id: createDto.gameId },
    });
    if (!game) {
      throw new NotFoundException(`Game with ID ${createDto.gameId} not found`);
    }

    try {
      return await this.prisma.gameWeeklySchedule.create({
        data: {
          gameId: createDto.gameId,
          dayOfWeek: createDto.dayOfWeek,
          startTime: createDto.startTime,
          endTime: createDto.endTime,
          interval: createDto.interval ?? 10,
          isActive: createDto.isActive ?? true,
        },
        include: {
          game: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Weekly schedule for game ${createDto.gameId} on day ${createDto.dayOfWeek} already exists`
          );
        }
      }
      throw error;
    }
  }

  async findAll(query: FindGameWeeklySchedulesQueryDto): Promise<GameWeeklySchedule[]> {
    const { gameId, dayOfWeek, isActive } = query;

    const where: Prisma.GameWeeklyScheduleWhereInput = {};
    if (gameId) where.gameId = gameId;
    if (dayOfWeek !== undefined) where.dayOfWeek = dayOfWeek;
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.gameWeeklySchedule.findMany({
      where,
      orderBy: [{ gameId: 'asc' }, { dayOfWeek: 'asc' }],
      include: {
        game: true,
      },
    });
  }

  async findOne(id: number): Promise<GameWeeklySchedule> {
    const schedule = await this.prisma.gameWeeklySchedule.findUnique({
      where: { id },
      include: {
        game: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`GameWeeklySchedule with ID ${id} not found`);
    }

    return schedule;
  }

  async findByGame(gameId: number): Promise<GameWeeklySchedule[]> {
    return this.prisma.gameWeeklySchedule.findMany({
      where: { gameId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async update(id: number, updateDto: UpdateGameWeeklyScheduleDto): Promise<GameWeeklySchedule> {
    this.logger.log(`Updating GameWeeklySchedule with ID: ${id}`);

    await this.findOne(id);

    return this.prisma.gameWeeklySchedule.update({
      where: { id },
      data: {
        startTime: updateDto.startTime,
        endTime: updateDto.endTime,
        interval: updateDto.interval,
        isActive: updateDto.isActive,
      },
      include: {
        game: true,
      },
    });
  }

  async remove(id: number): Promise<GameWeeklySchedule> {
    this.logger.log(`Deleting GameWeeklySchedule with ID: ${id}`);

    await this.findOne(id);

    return this.prisma.gameWeeklySchedule.delete({
      where: { id },
    });
  }

  async bulkCreate(dto: BulkCreateGameWeeklyScheduleDto): Promise<{ created: number }> {
    this.logger.log(`Bulk creating weekly schedules for game ${dto.gameId}`);

    const game = await this.prisma.game.findUnique({
      where: { id: dto.gameId },
    });
    if (!game) {
      throw new NotFoundException(`Game with ID ${dto.gameId} not found`);
    }

    const daysToCreate = dto.includeWeekend
      ? [0, 1, 2, 3, 4, 5, 6] // 일~토
      : [1, 2, 3, 4, 5]; // 월~금

    const schedulesToCreate: Prisma.GameWeeklyScheduleCreateManyInput[] = daysToCreate.map(dayOfWeek => ({
      gameId: dto.gameId,
      dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      interval: dto.interval ?? 10,
      isActive: true,
    }));

    const result = await this.prisma.gameWeeklySchedule.createMany({
      data: schedulesToCreate,
      skipDuplicates: true,
    });

    return { created: result.count };
  }

  async removeByGame(gameId: number): Promise<{ deleted: number }> {
    this.logger.log(`Deleting all weekly schedules for game ${gameId}`);

    const result = await this.prisma.gameWeeklySchedule.deleteMany({
      where: { gameId },
    });

    return { deleted: result.count };
  }
}
