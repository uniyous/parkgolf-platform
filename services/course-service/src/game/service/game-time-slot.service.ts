import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GameTimeSlot, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateGameTimeSlotDto,
  UpdateGameTimeSlotDto,
  FindGameTimeSlotsQueryDto,
  GenerateTimeSlotsDto,
} from '../dto/game-time-slot.dto';

@Injectable()
export class GameTimeSlotService {
  private readonly logger = new Logger(GameTimeSlotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateGameTimeSlotDto): Promise<GameTimeSlot> {
    this.logger.log(`Creating time slot for game ${createDto.gameId} on ${createDto.date}`);

    const game = await this.prisma.game.findUnique({
      where: { id: createDto.gameId },
    });
    if (!game) {
      throw new NotFoundException(`Game with ID ${createDto.gameId} not found`);
    }

    try {
      return await this.prisma.gameTimeSlot.create({
        data: {
          gameId: createDto.gameId,
          date: new Date(createDto.date),
          startTime: createDto.startTime,
          endTime: createDto.endTime,
          maxPlayers: createDto.maxPlayers ?? game.maxPlayers,
          bookedPlayers: 0,
          price: createDto.price,
          isPremium: createDto.isPremium ?? false,
          status: createDto.status ?? 'AVAILABLE',
          isActive: createDto.isActive ?? true,
        },
        include: {
          game: {
            include: {
              frontNineCourse: true,
              backNineCourse: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Time slot already exists for game ${createDto.gameId} on ${createDto.date} at ${createDto.startTime}`
          );
        }
      }
      throw error;
    }
  }

  async findAll(query: FindGameTimeSlotsQueryDto): Promise<{
    data: GameTimeSlot[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { gameId, date, dateFrom, dateTo, status, isActive, availableOnly, page = 1, limit = 50 } = query;

    const where: Prisma.GameTimeSlotWhereInput = {};
    if (gameId) where.gameId = gameId;
    if (date) where.date = new Date(date);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    if (availableOnly) {
      where.status = 'AVAILABLE';
      where.isActive = true;
    }

    const skip = (page - 1) * limit;

    const [slots, total] = await this.prisma.$transaction([
      this.prisma.gameTimeSlot.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          game: {
            include: {
              frontNineCourse: true,
              backNineCourse: true,
              club: true,
            },
          },
        },
      }),
      this.prisma.gameTimeSlot.count({ where }),
    ]);

    return { data: slots, total, page, limit };
  }

  async findOne(id: number): Promise<GameTimeSlot> {
    const slot = await this.prisma.gameTimeSlot.findUnique({
      where: { id },
      include: {
        game: {
          include: {
            frontNineCourse: true,
            backNineCourse: true,
            club: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException(`GameTimeSlot with ID ${id} not found`);
    }

    return slot;
  }

  async findByGameAndDate(gameId: number, date: string): Promise<GameTimeSlot[]> {
    return this.prisma.gameTimeSlot.findMany({
      where: {
        gameId,
        date: new Date(date),
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
      include: {
        game: {
          include: {
            frontNineCourse: true,
            backNineCourse: true,
          },
        },
      },
    });
  }

  async update(id: number, updateDto: UpdateGameTimeSlotDto): Promise<GameTimeSlot> {
    this.logger.log(`Updating GameTimeSlot with ID: ${id}`);

    await this.findOne(id);

    return this.prisma.gameTimeSlot.update({
      where: { id },
      data: {
        startTime: updateDto.startTime,
        endTime: updateDto.endTime,
        maxPlayers: updateDto.maxPlayers,
        bookedPlayers: updateDto.bookedPlayers,
        price: updateDto.price,
        isPremium: updateDto.isPremium,
        status: updateDto.status,
        isActive: updateDto.isActive,
      },
      include: {
        game: {
          include: {
            frontNineCourse: true,
            backNineCourse: true,
          },
        },
      },
    });
  }

  async remove(id: number): Promise<GameTimeSlot> {
    this.logger.log(`Deleting GameTimeSlot with ID: ${id}`);

    await this.findOne(id);

    return this.prisma.gameTimeSlot.delete({
      where: { id },
    });
  }

  async generateTimeSlots(dto: GenerateTimeSlotsDto): Promise<{ created: number; skipped: number }> {
    this.logger.log(`Generating time slots for game ${dto.gameId} from ${dto.dateFrom} to ${dto.dateTo}`);

    const game = await this.prisma.game.findUnique({
      where: { id: dto.gameId },
      include: { weeklySchedules: { where: { isActive: true } } },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${dto.gameId} not found`);
    }

    if (game.weeklySchedules.length === 0) {
      throw new ConflictException(`No weekly schedules found for game ${dto.gameId}`);
    }

    const startDate = new Date(dto.dateFrom);
    const endDate = new Date(dto.dateTo);
    const slotsToCreate: Prisma.GameTimeSlotCreateManyInput[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const schedule = game.weeklySchedules.find(s => s.dayOfWeek === dayOfWeek);

      if (!schedule) continue;

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const price = isWeekend && game.weekendPrice
        ? Number(game.weekendPrice)
        : Number(game.basePrice);

      const slots = this.generateSlotsForDay(
        schedule.startTime,
        schedule.endTime,
        schedule.interval,
        game.estimatedDuration
      );

      for (const slot of slots) {
        slotsToCreate.push({
          gameId: dto.gameId,
          date: new Date(d),
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxPlayers: game.maxPlayers,
          bookedPlayers: 0,
          price,
          isPremium: isWeekend,
          status: 'AVAILABLE',
          isActive: true,
        });
      }
    }

    if (dto.overwrite) {
      await this.prisma.gameTimeSlot.deleteMany({
        where: {
          gameId: dto.gameId,
          date: { gte: startDate, lte: endDate },
        },
      });
    }

    const result = await this.prisma.gameTimeSlot.createMany({
      data: slotsToCreate,
      skipDuplicates: true,
    });

    return {
      created: result.count,
      skipped: slotsToCreate.length - result.count,
    };
  }

  private generateSlotsForDay(
    startTime: string,
    endTime: string,
    interval: number,
    duration: number
  ): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + duration <= endMinutes + duration) {
      const slotStart = this.minutesToTime(currentMinutes);
      const slotEnd = this.minutesToTime(currentMinutes + duration);

      if (currentMinutes + duration > 24 * 60) break;

      slots.push({ startTime: slotStart, endTime: slotEnd });
      currentMinutes += interval;

      if (currentMinutes >= endMinutes) break;
    }

    return slots;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  async bookSlot(id: number, playerCount: number): Promise<GameTimeSlot> {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.gameTimeSlot.findUnique({
        where: { id },
      });

      if (!slot) {
        throw new NotFoundException(`GameTimeSlot with ID ${id} not found`);
      }

      if (slot.status !== 'AVAILABLE') {
        throw new ConflictException(`Time slot is not available (status: ${slot.status})`);
      }

      const newBookedPlayers = slot.bookedPlayers + playerCount;
      if (newBookedPlayers > slot.maxPlayers) {
        throw new ConflictException(
          `Not enough capacity. Available: ${slot.maxPlayers - slot.bookedPlayers}, Requested: ${playerCount}`
        );
      }

      const newStatus = newBookedPlayers >= slot.maxPlayers ? 'FULLY_BOOKED' : 'AVAILABLE';

      return tx.gameTimeSlot.update({
        where: { id },
        data: {
          bookedPlayers: newBookedPlayers,
          status: newStatus,
        },
      });
    });
  }

  async releaseSlot(id: number, playerCount: number): Promise<GameTimeSlot> {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.gameTimeSlot.findUnique({
        where: { id },
      });

      if (!slot) {
        throw new NotFoundException(`GameTimeSlot with ID ${id} not found`);
      }

      const newBookedPlayers = Math.max(0, slot.bookedPlayers - playerCount);
      const newStatus = newBookedPlayers < slot.maxPlayers ? 'AVAILABLE' : 'FULLY_BOOKED';

      return tx.gameTimeSlot.update({
        where: { id },
        data: {
          bookedPlayers: newBookedPlayers,
          status: newStatus,
        },
      });
    });
  }
}
