import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Game, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto, FindGamesQueryDto, SearchGamesQueryDto } from '../dto/game.dto';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateGameDto): Promise<Game> {
    this.logger.log(`Creating game: ${createDto.name} (${createDto.code})`);

    // Club 존재 확인
    const club = await this.prisma.club.findUnique({
      where: { id: createDto.clubId },
    });
    if (!club) {
      throw new NotFoundException(`Club with ID ${createDto.clubId} not found`);
    }

    // Front/Back Nine Course 존재 확인
    const [frontCourse, backCourse] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: createDto.frontNineCourseId } }),
      this.prisma.course.findUnique({ where: { id: createDto.backNineCourseId } }),
    ]);

    if (!frontCourse) {
      throw new NotFoundException(`Front nine course with ID ${createDto.frontNineCourseId} not found`);
    }
    if (!backCourse) {
      throw new NotFoundException(`Back nine course with ID ${createDto.backNineCourseId} not found`);
    }

    // 같은 코스 조합 중복 체크
    if (createDto.frontNineCourseId === createDto.backNineCourseId) {
      throw new ConflictException('Front nine and back nine must be different courses');
    }

    try {
      return await this.prisma.game.create({
        data: {
          name: createDto.name,
          code: createDto.code,
          description: createDto.description,
          frontNineCourseId: createDto.frontNineCourseId,
          backNineCourseId: createDto.backNineCourseId,
          totalHoles: createDto.totalHoles ?? 18,
          estimatedDuration: createDto.estimatedDuration ?? 180,
          breakDuration: createDto.breakDuration ?? 10,
          maxPlayers: createDto.maxPlayers ?? 4,
          basePrice: createDto.basePrice,
          weekendPrice: createDto.weekendPrice,
          holidayPrice: createDto.holidayPrice,
          clubId: createDto.clubId,
          status: createDto.status ?? 'ACTIVE',
          isActive: createDto.isActive ?? true,
        },
        include: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('code')) {
            throw new ConflictException(`Game with code "${createDto.code}" already exists`);
          }
          if (target?.includes('front_nine_course_id') && target?.includes('back_nine_course_id')) {
            throw new ConflictException('This course combination already exists as a game');
          }
        }
      }
      throw error;
    }
  }

  async findAll(query: FindGamesQueryDto): Promise<{ data: Game[]; total: number; page: number; limit: number }> {
    const { clubId, name, status, isActive, page = 1, limit = 10 } = query;

    const where: Prisma.GameWhereInput = {};
    if (clubId) where.clubId = clubId;
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;

    const [games, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return { data: games, total, page, limit };
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        frontNineCourse: {
          include: { holes: true },
        },
        backNineCourse: {
          include: { holes: true },
        },
        club: true,
        weeklySchedules: true,
      },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    return game;
  }

  async findByClub(clubId: number): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: { clubId, isActive: true },
      include: {
        frontNineCourse: true,
        backNineCourse: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, updateDto: UpdateGameDto): Promise<Game> {
    this.logger.log(`Updating game with ID: ${id}`);

    await this.findOne(id);

    // Course 변경 시 존재 확인
    if (updateDto.frontNineCourseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: updateDto.frontNineCourseId },
      });
      if (!course) {
        throw new NotFoundException(`Front nine course with ID ${updateDto.frontNineCourseId} not found`);
      }
    }

    if (updateDto.backNineCourseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: updateDto.backNineCourseId },
      });
      if (!course) {
        throw new NotFoundException(`Back nine course with ID ${updateDto.backNineCourseId} not found`);
      }
    }

    try {
      return await this.prisma.game.update({
        where: { id },
        data: {
          name: updateDto.name,
          code: updateDto.code,
          description: updateDto.description,
          frontNineCourseId: updateDto.frontNineCourseId,
          backNineCourseId: updateDto.backNineCourseId,
          totalHoles: updateDto.totalHoles,
          estimatedDuration: updateDto.estimatedDuration,
          breakDuration: updateDto.breakDuration,
          maxPlayers: updateDto.maxPlayers,
          basePrice: updateDto.basePrice,
          weekendPrice: updateDto.weekendPrice,
          holidayPrice: updateDto.holidayPrice,
          clubId: updateDto.clubId,
          status: updateDto.status,
          isActive: updateDto.isActive,
        },
        include: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Game code or course combination already exists');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Game> {
    this.logger.log(`Deleting game with ID: ${id}`);

    await this.findOne(id);

    try {
      return await this.prisma.game.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2014') {
          throw new ConflictException(
            `Cannot delete game with ID ${id}. Please delete related time slots and schedules first.`
          );
        }
      }
      throw error;
    }
  }

  async searchGames(query: SearchGamesQueryDto): Promise<{ data: (Game & { timeSlots?: any[] })[]; total: number; page: number; limit: number }> {
    const {
      search,
      date,
      clubId,
      minPrice,
      maxPrice,
      minPlayers,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = query;

    this.logger.log(`Searching games - search: ${search || 'none'}, date: ${date || 'none'}, clubId: ${clubId || 'all'}, price: ${minPrice}-${maxPrice}, minPlayers: ${minPlayers}`);

    const where: Prisma.GameWhereInput = {
      isActive: true,
    };

    // 타임슬롯 맵 (gameId -> timeSlots[])
    const timeSlotsMap = new Map<number, any[]>();

    // 날짜 필터 - 해당 날짜에 예약 가능한 타임슬롯이 있는 게임만 필터링
    if (date) {
      const targetDate = new Date(date);

      // 최적화: Raw SQL로 bookedPlayers < maxPlayers 조건을 DB 레벨에서 처리
      // 불필요한 game 관계 데이터 제외 (나중에 별도로 조회)
      const availableSlots = await this.prisma.$queryRaw<Array<{
        id: number;
        game_id: number;
        date: Date;
        start_time: string;
        end_time: string;
        max_players: number;
        booked_players: number;
        price: string;
        is_premium: boolean;
        status: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT
          id, game_id, date, start_time, end_time,
          max_players, booked_players, price,
          is_premium, status, is_active, created_at, updated_at
        FROM game_time_slots
        WHERE date = ${targetDate}
          AND status = 'AVAILABLE'
          AND is_active = true
          AND booked_players < max_players
        ORDER BY game_id, start_time
      `;

      // 결과 매핑
      const availableGameIds = new Set<number>();
      availableSlots.forEach(slot => {
        availableGameIds.add(slot.game_id);
        if (!timeSlotsMap.has(slot.game_id)) {
          timeSlotsMap.set(slot.game_id, []);
        }
        // snake_case -> camelCase 변환
        timeSlotsMap.get(slot.game_id)!.push({
          id: slot.id,
          gameId: slot.game_id,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          maxPlayers: slot.max_players,
          bookedPlayers: slot.booked_players,
          availablePlayers: slot.max_players - slot.booked_players,
          price: Number(slot.price),
          isPremium: slot.is_premium,
          status: slot.status,
          isActive: slot.is_active,
          createdAt: slot.created_at,
          updatedAt: slot.updated_at,
        });
      });

      if (availableGameIds.size === 0) {
        // 가용 슬롯이 없으면 빈 결과 반환
        return { data: [], total: 0, page, limit };
      }

      where.id = { in: [...availableGameIds] };
    }

    // 텍스트 검색 (게임명, 클럽명, 클럽 위치)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { club: { name: { contains: search, mode: 'insensitive' } } },
        { club: { location: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 클럽 필터
    if (clubId) {
      where.clubId = clubId;
    }

    // 가격 범위 필터
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) {
        where.basePrice.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.basePrice.lte = maxPrice;
      }
    }

    // 최소 인원수 필터
    if (minPlayers !== undefined) {
      where.maxPlayers = { gte: minPlayers };
    }

    // 정렬 설정
    const orderBy: Prisma.GameOrderByWithRelationInput = {};
    if (sortBy === 'price') {
      orderBy.basePrice = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    }

    const skip = (page - 1) * limit;

    const [games, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    // 날짜가 제공된 경우 타임슬롯 추가
    const gamesWithSlots = games.map(game => ({
      ...game,
      timeSlots: date ? timeSlotsMap.get(game.id) || [] : undefined,
    }));

    return { data: gamesWithSlots, total, page, limit };
  }
}
