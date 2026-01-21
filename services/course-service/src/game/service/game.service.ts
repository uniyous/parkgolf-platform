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

  async searchGames(query: SearchGamesQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      search,
      date,
      startTimeFrom,
      startTimeTo,
      clubId,
      minPrice,
      maxPrice,
      minPlayers,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = query;

    // 날짜가 없으면 오늘 날짜를 기본값으로 사용 (항상 타임슬롯이 있는 게임만 조회)
    const searchDate = date || new Date().toISOString().split('T')[0];

    this.logger.log(`Searching games - search: ${search || 'none'}, date: ${searchDate}, timeRange: ${startTimeFrom || 'any'}-${startTimeTo || 'any'}, clubId: ${clubId || 'all'}, price: ${minPrice}-${maxPrice}, minPlayers: ${minPlayers}`);

    const targetDate = new Date(searchDate);

    // 최적화: 단일 Raw SQL 쿼리로 Game + Club + Course + TimeSlots 모두 조회
    // 필요한 필드만 선택하여 over-fetching 방지
    const searchPattern = search ? `%${search}%` : null;

    // 검색 조건과 타임슬롯을 한 번에 조회
    const gamesWithData = await this.prisma.$queryRaw<Array<{
      // Game fields
      game_id: number;
      game_name: string;
      game_code: string;
      game_description: string | null;
      total_holes: number;
      estimated_duration: number;
      break_duration: number;
      max_players: number;
      base_price: string;
      weekend_price: string | null;
      holiday_price: string | null;
      game_status: string;
      game_is_active: boolean;
      // Club fields
      club_id: number;
      club_name: string;
      club_location: string;
      club_address: string;
      club_phone: string;
      // Course fields
      front_course_id: number;
      front_course_name: string;
      front_course_code: string;
      back_course_id: number;
      back_course_name: string;
      back_course_code: string;
      // TimeSlot aggregated JSON
      time_slots: string;
    }>>`
      WITH available_slots AS (
        SELECT
          gts.game_id,
          json_agg(
            json_build_object(
              'id', gts.id,
              'gameId', gts.game_id,
              'date', gts.date,
              'startTime', gts.start_time,
              'endTime', gts.end_time,
              'maxPlayers', gts.max_players,
              'bookedPlayers', gts.booked_players,
              'availablePlayers', gts.max_players - gts.booked_players,
              'price', gts.price,
              'isPremium', gts.is_premium,
              'status', gts.status
            ) ORDER BY gts.start_time
          ) AS slots
        FROM game_time_slots gts
        WHERE gts.date = ${targetDate}
          AND gts.status = 'AVAILABLE'
          AND gts.is_active = true
          AND gts.booked_players < gts.max_players
          AND (${minPlayers ?? null}::int IS NULL OR (gts.max_players - gts.booked_players) >= ${minPlayers ?? null})
          AND (${startTimeFrom ?? null}::text IS NULL OR gts.start_time >= ${startTimeFrom ?? null})
          AND (${startTimeTo ?? null}::text IS NULL OR gts.start_time <= ${startTimeTo ?? null})
        GROUP BY gts.game_id
      )
      SELECT
        g.id AS game_id,
        g.name AS game_name,
        g.code AS game_code,
        g.description AS game_description,
        g.total_holes,
        g.estimated_duration,
        g.break_duration,
        g.max_players,
        g.base_price::text,
        g.weekend_price::text,
        g.holiday_price::text,
        g.status AS game_status,
        g.is_active AS game_is_active,
        c.id AS club_id,
        c.name AS club_name,
        c.location AS club_location,
        c.address AS club_address,
        c.phone AS club_phone,
        fc.id AS front_course_id,
        fc.name AS front_course_name,
        fc.code AS front_course_code,
        bc.id AS back_course_id,
        bc.name AS back_course_name,
        bc.code AS back_course_code,
        COALESCE(slots::text, '[]') AS time_slots
      FROM games g
      INNER JOIN available_slots a ON g.id = a.game_id
      INNER JOIN clubs c ON g.club_id = c.id
      INNER JOIN courses fc ON g.front_nine_course_id = fc.id
      INNER JOIN courses bc ON g.back_nine_course_id = bc.id
      WHERE g.is_active = true
        AND (${searchPattern}::text IS NULL OR (
          g.name ILIKE ${searchPattern}
          OR c.name ILIKE ${searchPattern}
          OR c.location ILIKE ${searchPattern}
        ))
        AND (${clubId ?? null}::int IS NULL OR g.club_id = ${clubId ?? null})
        AND (${minPrice ?? null}::decimal IS NULL OR g.base_price >= ${minPrice ?? null})
        AND (${maxPrice ?? null}::decimal IS NULL OR g.base_price <= ${maxPrice ?? null})
      ORDER BY
        CASE WHEN ${sortBy} = 'price' AND ${sortOrder} = 'asc' THEN g.base_price END ASC,
        CASE WHEN ${sortBy} = 'price' AND ${sortOrder} = 'desc' THEN g.base_price END DESC,
        CASE WHEN ${sortBy} = 'name' AND ${sortOrder} = 'asc' THEN g.name END ASC,
        CASE WHEN ${sortBy} = 'name' AND ${sortOrder} = 'desc' THEN g.name END DESC,
        CASE WHEN ${sortBy} = 'createdAt' AND ${sortOrder} = 'asc' THEN g.created_at END ASC,
        CASE WHEN ${sortBy} = 'createdAt' AND ${sortOrder} = 'desc' THEN g.created_at END DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;

    // 전체 개수 조회 (별도 쿼리 - 페이징 필요)
    const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT g.id) AS count
      FROM games g
      INNER JOIN game_time_slots gts ON g.id = gts.game_id
        AND gts.date = ${targetDate}
        AND gts.status = 'AVAILABLE'
        AND gts.is_active = true
        AND gts.booked_players < gts.max_players
        AND (${minPlayers ?? null}::int IS NULL OR (gts.max_players - gts.booked_players) >= ${minPlayers ?? null})
        AND (${startTimeFrom ?? null}::text IS NULL OR gts.start_time >= ${startTimeFrom ?? null})
        AND (${startTimeTo ?? null}::text IS NULL OR gts.start_time <= ${startTimeTo ?? null})
      INNER JOIN clubs c ON g.club_id = c.id
      WHERE g.is_active = true
        AND (${searchPattern}::text IS NULL OR (
          g.name ILIKE ${searchPattern}
          OR c.name ILIKE ${searchPattern}
          OR c.location ILIKE ${searchPattern}
        ))
        AND (${clubId ?? null}::int IS NULL OR g.club_id = ${clubId ?? null})
        AND (${minPrice ?? null}::decimal IS NULL OR g.base_price >= ${minPrice ?? null})
        AND (${maxPrice ?? null}::decimal IS NULL OR g.base_price <= ${maxPrice ?? null})
    `;

    const total = Number(countResult[0]?.count ?? 0);

    // 결과를 프론트엔드가 기대하는 형태로 변환
    const data = gamesWithData.map(row => ({
      id: row.game_id,
      name: row.game_name,
      code: row.game_code,
      description: row.game_description,
      totalHoles: row.total_holes,
      estimatedDuration: row.estimated_duration,
      duration: row.estimated_duration, // alias for frontend compatibility
      breakDuration: row.break_duration,
      maxPlayers: row.max_players,
      basePrice: Number(row.base_price),
      pricePerPerson: Number(row.base_price), // alias for frontend compatibility
      weekendPrice: row.weekend_price ? Number(row.weekend_price) : null,
      holidayPrice: row.holiday_price ? Number(row.holiday_price) : null,
      status: row.game_status,
      isActive: row.game_is_active,
      clubId: row.club_id,
      clubName: row.club_name,
      club: {
        id: row.club_id,
        name: row.club_name,
        location: row.club_location,
        address: row.club_address,
        phone: row.club_phone,
      },
      frontNineCourseId: row.front_course_id,
      backNineCourseId: row.back_course_id,
      frontNineCourse: {
        id: row.front_course_id,
        name: row.front_course_name,
        code: row.front_course_code,
      },
      backNineCourse: {
        id: row.back_course_id,
        name: row.back_course_name,
        code: row.back_course_code,
      },
      timeSlots: JSON.parse(row.time_slots),
    }));

    return { data, total, page, limit };
  }
}
