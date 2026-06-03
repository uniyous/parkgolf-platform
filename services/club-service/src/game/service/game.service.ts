import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, count, desc, asc, ilike, sql, type SQL } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { pgCode } from '../../db/db-error';
import type { Game } from '../../db/schema';
import { games, courses, clubs } from '../../db/schema';
import { CreateGameDto, UpdateGameDto, FindGamesQueryDto, SearchGamesQueryDto } from '../dto/game.dto';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(createDto: CreateGameDto): Promise<Game> {
    this.logger.log(`Creating game: ${createDto.name} (${createDto.code})`);

    // Club 존재 확인
    const [club] = await this.db.select().from(clubs).where(eq(clubs.id, createDto.clubId)).limit(1);
    if (!club) {
      throw new NotFoundException(`Club with ID ${createDto.clubId} not found`);
    }

    // Front/Back Nine Course 존재 확인
    const [frontResult, backResult] = await Promise.all([
      this.db.select().from(courses).where(eq(courses.id, createDto.frontNineCourseId)).limit(1),
      this.db.select().from(courses).where(eq(courses.id, createDto.backNineCourseId)).limit(1),
    ]);
    const frontCourse = frontResult[0];
    const backCourse = backResult[0];

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
      const [created] = await this.db
        .insert(games)
        .values({
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
          slotMode: createDto.slotMode ?? 'TEE_TIME',
          status: createDto.status ?? 'ACTIVE',
          isActive: createDto.isActive ?? true,
        })
        .returning();

      return await this.db.query.games.findFirst({
        where: eq(games.id, created.id),
        with: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      });
    } catch (error) {
      if (pgCode(error) === '23505') {
        const constraint = String(error?.constraint ?? '');
        if (constraint === 'games_code_key') {
          throw new ConflictException(`Game with code "${createDto.code}" already exists`);
        }
        if (constraint === 'games_front_nine_course_id_back_nine_course_id_key') {
          throw new ConflictException('This course combination already exists as a game');
        }
      }
      throw error;
    }
  }

  async findAll(query: FindGamesQueryDto): Promise<{ data: Game[]; total: number; page: number; limit: number }> {
    const { companyId, clubId, name, status, isActive, page = 1, limit = 10 } = query;

    // REST 쿼리 파라미터가 문자열로 전달될 수 있어 skip/take(Int)용으로 변환
    // (예: ?limit=20 → "20" → take 타입 에러 방지)
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const conds: SQL[] = [];
    if (companyId) conds.push(sql`${games.clubId} IN (SELECT ${clubs.id} FROM ${clubs} WHERE ${clubs.companyId} = ${Number(companyId)})`);
    if (clubId) conds.push(eq(games.clubId, Number(clubId)));
    if (name) conds.push(ilike(games.name, `%${name}%`));
    if (status) conds.push(eq(games.status, status));
    if (isActive !== undefined) conds.push(eq(games.isActive, isActive));

    const where = conds.length ? and(...conds) : undefined;

    const skip = (pageNum - 1) * limitNum;

    const [gamesList, countRows] = await Promise.all([
      this.db.query.games.findMany({
        where,
        offset: skip,
        limit: limitNum,
        orderBy: desc(games.createdAt),
        with: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      }),
      this.db.select({ value: count() }).from(games).where(where),
    ]);

    const total = countRows[0].value;

    return { data: gamesList, total, page: pageNum, limit: limitNum };
  }

  async findOne(id: number): Promise<Game> {
    const game = await this.db.query.games.findFirst({
      where: eq(games.id, id),
      with: {
        frontNineCourse: {
          with: { holes: true },
        },
        backNineCourse: {
          with: { holes: true },
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
    return this.db.query.games.findMany({
      where: and(eq(games.clubId, clubId), eq(games.isActive, true)),
      with: {
        frontNineCourse: true,
        backNineCourse: true,
      },
      orderBy: asc(games.name),
    });
  }

  async update(id: number, updateDto: UpdateGameDto): Promise<Game> {
    this.logger.log(`Updating game with ID: ${id}`);

    await this.findOne(id);

    // Course 변경 시 존재 확인
    if (updateDto.frontNineCourseId) {
      const [course] = await this.db
        .select()
        .from(courses)
        .where(eq(courses.id, updateDto.frontNineCourseId))
        .limit(1);
      if (!course) {
        throw new NotFoundException(`Front nine course with ID ${updateDto.frontNineCourseId} not found`);
      }
    }

    if (updateDto.backNineCourseId) {
      const [course] = await this.db
        .select()
        .from(courses)
        .where(eq(courses.id, updateDto.backNineCourseId))
        .limit(1);
      if (!course) {
        throw new NotFoundException(`Back nine course with ID ${updateDto.backNineCourseId} not found`);
      }
    }

    try {
      const [updated] = await this.db
        .update(games)
        .set({
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
          slotMode: updateDto.slotMode,
          status: updateDto.status,
          isActive: updateDto.isActive,
        })
        .where(eq(games.id, id))
        .returning();

      return await this.db.query.games.findFirst({
        where: eq(games.id, updated.id),
        with: {
          frontNineCourse: true,
          backNineCourse: true,
          club: true,
        },
      });
    } catch (error) {
      if (pgCode(error) === '23505') {
        throw new ConflictException('Game code or course combination already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Game> {
    this.logger.log(`Deleting game with ID: ${id}`);

    await this.findOne(id);

    try {
      const [deleted] = await this.db.delete(games).where(eq(games.id, id)).returning();
      return deleted;
    } catch (error) {
      if (pgCode(error) === '23503') {
        throw new ConflictException(
          `Cannot delete game with ID ${id}. Please delete related time slots and schedules first.`
        );
      }
      throw error;
    }
  }

  async searchGames(query: SearchGamesQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const {
      search,
      date,
      startTimeFrom: explicitStartTimeFrom,
      startTimeTo: explicitStartTimeTo,
      timeOfDay,
      clubId,
      minPrice,
      maxPrice,
      minPlayers,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = query;

    // timeOfDay → startTimeFrom/startTimeTo 변환 (명시적 값이 없을 때만)
    const TIME_RANGES: Record<string, [string, string]> = {
      DAWN:      ['05:00', '08:00'],
      MORNING:   ['08:00', '12:00'],
      AFTERNOON: ['12:00', '17:00'],
      EVENING:   ['17:00', '22:00'],
    };

    let startTimeFrom = explicitStartTimeFrom;
    let startTimeTo = explicitStartTimeTo;

    if (timeOfDay && TIME_RANGES[timeOfDay] && !startTimeFrom && !startTimeTo) {
      [startTimeFrom, startTimeTo] = TIME_RANGES[timeOfDay];
    }

    // 날짜가 없으면 오늘 날짜를 기본값으로 사용 (항상 타임슬롯이 있는 게임만 조회)
    const searchDate = date || new Date().toISOString().split('T')[0];

    this.logger.log(`Searching games - search: ${search || 'none'}, date: ${searchDate}, timeOfDay: ${timeOfDay || 'all'}, timeRange: ${startTimeFrom || 'any'}-${startTimeTo || 'any'}, clubId: ${clubId || 'all'}, price: ${minPrice}-${maxPrice}, minPlayers: ${minPlayers}`);

    const targetDate = new Date(searchDate);

    // 최적화: 단일 Raw SQL 쿼리로 Game + Club + Course + TimeSlots 모두 조회
    // 필요한 필드만 선택하여 over-fetching 방지
    const searchPattern = search ? `%${search}%` : null;

    // 검색 조건과 타임슬롯을 한 번에 조회
    // 시간 필터: TEE_TIME은 start_time 범위, SESSION은 시간 overlap 방식
    const gamesWithData = (await this.db.execute(sql`
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
        INNER JOIN games g2 ON gts.game_id = g2.id
        WHERE gts.date = ${targetDate}
          AND gts.status = 'AVAILABLE'
          AND gts.is_active = true
          AND gts.booked_players < gts.max_players
          AND (${minPlayers ?? null}::int IS NULL OR (gts.max_players - gts.booked_players) >= ${minPlayers ?? null})
          AND (
            ${startTimeFrom ?? null}::text IS NULL
            OR (
              CASE WHEN g2.slot_mode = 'SESSION'
                THEN gts.start_time < ${startTimeTo ?? null} AND gts.end_time > ${startTimeFrom ?? null}
                ELSE gts.start_time >= ${startTimeFrom ?? null}
              END
            )
          )
          AND (
            ${startTimeTo ?? null}::text IS NULL
            OR (
              CASE WHEN g2.slot_mode = 'SESSION'
                THEN gts.start_time < ${startTimeTo ?? null} AND gts.end_time > ${startTimeFrom ?? null}
                ELSE gts.start_time < ${startTimeTo ?? null}
              END
            )
          )
        GROUP BY gts.game_id
      )
      SELECT
        g.id AS game_id,
        g.name AS game_name,
        g.code AS game_code,
        g.description AS game_description,
        g.slot_mode,
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
    `)) as unknown as Array<{
      // Game fields
      game_id: number;
      game_name: string;
      game_code: string;
      game_description: string | null;
      slot_mode: string;
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
    }>;

    // 전체 개수 조회 (별도 쿼리 - 페이징 필요)
    const countResult = (await this.db.execute(sql`
      SELECT COUNT(DISTINCT g.id) AS count
      FROM games g
      INNER JOIN game_time_slots gts ON g.id = gts.game_id
        AND gts.date = ${targetDate}
        AND gts.status = 'AVAILABLE'
        AND gts.is_active = true
        AND gts.booked_players < gts.max_players
        AND (${minPlayers ?? null}::int IS NULL OR (gts.max_players - gts.booked_players) >= ${minPlayers ?? null})
        AND (
          ${startTimeFrom ?? null}::text IS NULL
          OR (
            CASE WHEN g.slot_mode = 'SESSION'
              THEN gts.start_time < ${startTimeTo ?? null} AND gts.end_time > ${startTimeFrom ?? null}
              ELSE gts.start_time >= ${startTimeFrom ?? null}
            END
          )
        )
        AND (
          ${startTimeTo ?? null}::text IS NULL
          OR (
            CASE WHEN g.slot_mode = 'SESSION'
              THEN gts.start_time < ${startTimeTo ?? null} AND gts.end_time > ${startTimeFrom ?? null}
              ELSE gts.start_time < ${startTimeTo ?? null}
            END
          )
        )
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
    `)) as unknown as Array<{ count: bigint }>;

    const total = Number(countResult[0]?.count ?? 0);

    // 결과를 프론트엔드가 기대하는 형태로 변환
    const data = gamesWithData.map(row => ({
      id: row.game_id,
      name: row.game_name,
      code: row.game_code,
      description: row.game_description,
      slotMode: row.slot_mode,
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
