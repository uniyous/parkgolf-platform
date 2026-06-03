import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { eq, and, or, ne, gte, lte, ilike, asc, desc, count, arrayContains, sql, type SQL } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { clubs, courses, holes } from '../../db/schema';
import type { Club } from '../../db/schema';
import {
  CreateClubDto,
  UpdateClubDto,
  ClubFilterDto,
  FindNearbyDto,
  ClubWithRelations,
  ClubResponseDto,
  NearbyClubResponseDto,
} from '../dto/club.dto';

/** Club 목록 응답 타입 (페이지네이션) */
export interface ClubListResult {
  data: ClubWithRelations[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class ClubService {
  private readonly logger = new Logger(ClubService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Inject('LOCATION_SERVICE') private readonly locationClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  /**
   * 주소 → 좌표 변환 (location-service 연동)
   * 실패 시 null 반환 (좌표 없이도 클럽 생성/수정 가능)
   */
  private async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const result = await firstValueFrom(
        this.locationClient.send('location.getCoordinates', { address }).pipe(timeout(10000)),
      );
      if (result?.success && result.data?.latitude && result.data?.longitude) {
        this.logger.log(`Geocoded "${address}" → (${result.data.latitude}, ${result.data.longitude})`);
        return { latitude: result.data.latitude, longitude: result.data.longitude };
      }
      return null;
    } catch (error) {
      this.logger.warn(`Geocoding failed for "${address}": ${error.message}`);
      return null;
    }
  }

  /**
   * 골프클럽 생성
   */
  async create(createClubDto: CreateClubDto): Promise<ClubWithRelations> {
    // 같은 회사 내에서 클럽명 중복 확인
    const [existingClub] = await this.db.select().from(clubs)
      .where(and(eq(clubs.companyId, createClubDto.companyId), eq(clubs.name, createClubDto.name)))
      .limit(1);

    if (existingClub) {
      throw new BadRequestException('Club with this name already exists in the company');
    }

    // 자동 지오코딩: address가 있고 좌표가 없으면 location-service 호출
    let { latitude, longitude } = createClubDto;
    if (!latitude && !longitude && createClubDto.address) {
      const coords = await this.geocodeAddress(createClubDto.address);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const [created] = await this.db.insert(clubs).values({
      ...createClubDto,
      latitude,
      longitude,
      operatingHours: createClubDto.operatingHours ? JSON.parse(JSON.stringify(createClubDto.operatingHours)) : undefined,
      seasonInfo: createClubDto.seasonInfo ? JSON.parse(JSON.stringify(createClubDto.seasonInfo)) : undefined,
      facilities: createClubDto.facilities || [],
    }).returning();

    const club = await this.db.query.clubs.findFirst({
      where: eq(clubs.id, created.id),
      with: { courses: { with: { holes: true } } },
    });

    this.logger.log(`Club created: ${created.name} (ID: ${created.id})`);
    return club as ClubWithRelations;
  }

  /**
   * 골프클럽 목록 조회 (필터링, 페이징 지원)
   */
  async findAll(filters: ClubFilterDto): Promise<ClubListResult> {
    const {
      companyId,
      search,
      location,
      status,
      bookingMode,
      minHoles,
      maxHoles,
      facilities,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = filters;

    // Convert page and limit to numbers
    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 20;

    // 검색 조건 구성
    const conds: SQL[] = [eq(clubs.isActive, true)];
    if (companyId) conds.push(eq(clubs.companyId, companyId));
    if (search) {
      conds.push(or(
        ilike(clubs.name, `%${search}%`),
        ilike(clubs.location, `%${search}%`),
        ilike(clubs.address, `%${search}%`),
      )!);
    }
    if (location) conds.push(ilike(clubs.location, `%${location}%`));
    if (status) conds.push(eq(clubs.status, status));
    if (bookingMode) conds.push(eq(clubs.bookingMode, bookingMode));
    if (minHoles) conds.push(gte(clubs.totalHoles, minHoles));
    if (maxHoles) conds.push(lte(clubs.totalHoles, maxHoles));
    if (facilities && facilities.length > 0) conds.push(arrayContains(clubs.facilities, facilities));

    const where = and(...conds);

    // 정렬 조건
    const sortCol = (clubs as Record<string, any>)[sortBy] ?? clubs.name;
    const orderBy = sortOrder === 'asc' ? asc(sortCol) : desc(sortCol);

    // 총 개수 조회
    const [totalRow] = await this.db.select({ value: count() }).from(clubs).where(where);
    const total = totalRow.value;

    // 페이징 계산
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // 데이터 조회
    const clubRows = await this.db.query.clubs.findMany({
      where,
      orderBy,
      offset: skip,
      limit: limitNum,
      with: { courses: true },
    });

    return {
      data: clubRows as ClubWithRelations[],
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    };
  }

  /**
   * 골프클럽 상세 조회
   */
  async findOne(id: number): Promise<ClubWithRelations> {
    const club = await this.db.query.clubs.findFirst({
      where: and(eq(clubs.id, id), eq(clubs.isActive, true)),
      with: { courses: { with: { holes: { with: { teeBoxes: true } } } } },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }

    return club as ClubWithRelations;
  }

  /**
   * 골프클럽 수정
   */
  async update(id: number, updateClubDto: UpdateClubDto): Promise<ClubWithRelations> {
    const [existingClub] = await this.db.select().from(clubs)
      .where(and(eq(clubs.id, id), eq(clubs.isActive, true))).limit(1);

    if (!existingClub) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }

    // 이름 변경 시 중복 확인
    if (updateClubDto.name && updateClubDto.name !== existingClub.name) {
      const companyId = updateClubDto.companyId || existingClub.companyId;
      const [duplicateClub] = await this.db.select().from(clubs)
        .where(and(eq(clubs.companyId, companyId), eq(clubs.name, updateClubDto.name), ne(clubs.id, id)))
        .limit(1);

      if (duplicateClub) {
        throw new BadRequestException('Club with this name already exists in the company');
      }
    }

    // 자동 지오코딩: 주소가 변경되었고 좌표가 직접 입력되지 않았으면
    let { latitude, longitude } = updateClubDto;
    const addressChanged = updateClubDto.address && updateClubDto.address !== existingClub.address;
    if (addressChanged && latitude === undefined && longitude === undefined) {
      const coords = await this.geocodeAddress(updateClubDto.address!);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const [updated] = await this.db.update(clubs).set({
      ...updateClubDto,
      latitude,
      longitude,
      operatingHours: updateClubDto.operatingHours ? JSON.parse(JSON.stringify(updateClubDto.operatingHours)) : undefined,
      seasonInfo: updateClubDto.seasonInfo ? JSON.parse(JSON.stringify(updateClubDto.seasonInfo)) : undefined,
    }).where(eq(clubs.id, id)).returning();

    const club = await this.db.query.clubs.findFirst({
      where: eq(clubs.id, updated.id),
      with: { courses: { with: { holes: true } } },
    });

    this.logger.log(`Club updated: ${updated.name} (ID: ${updated.id})`);
    return club as ClubWithRelations;
  }

  /**
   * 골프클럽 삭제 (soft delete)
   */
  async remove(id: number): Promise<void> {
    const [club] = await this.db.select().from(clubs)
      .where(and(eq(clubs.id, id), eq(clubs.isActive, true))).limit(1);

    if (!club) {
      throw new NotFoundException(`Club with ID ${id} not found`);
    }

    await this.db.update(clubs).set({ isActive: false }).where(eq(clubs.id, id));

    this.logger.log(`Club deleted: ${club.name} (ID: ${club.id})`);
  }

  /**
   * 회사별 골프클럽 목록 조회
   */
  async findByCompany(companyId: number): Promise<ClubWithRelations[]> {
    const rows = await this.db.query.clubs.findMany({
      where: and(eq(clubs.companyId, companyId), eq(clubs.isActive, true)),
      with: { courses: true },
      orderBy: asc(clubs.name),
    });
    return rows as ClubWithRelations[];
  }

  /**
   * 골프클럽 통계
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    byBookingMode: { platform: number; partner: number };
    byClubType: { paid: number; free: number };
  }> {
    const c = async (where: SQL) => {
      const [r] = await this.db.select({ value: count() }).from(clubs).where(where);
      return r.value;
    };
    const [total, active, inactive, maintenance, platform, partner, paid, free] =
      await Promise.all([
        c(eq(clubs.isActive, true)),
        c(and(eq(clubs.isActive, true), eq(clubs.status, 'ACTIVE'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.status, 'INACTIVE'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.status, 'MAINTENANCE'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.bookingMode, 'PLATFORM'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.bookingMode, 'PARTNER'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.clubType, 'PAID'))!),
        c(and(eq(clubs.isActive, true), eq(clubs.clubType, 'FREE'))!),
      ]);

    return {
      total,
      active,
      inactive,
      maintenance,
      byBookingMode: { platform, partner },
      byClubType: { paid, free },
    };
  }

  /**
   * 주변 골프클럽 검색 (Haversine 공식)
   */
  async findNearby(dto: FindNearbyDto): Promise<NearbyClubResponseDto[]> {
    const { latitude, longitude, radiusKm = 30, limit = 20 } = dto;

    const clubRows = (await this.db.execute(sql`
      SELECT
        id, name, location, address, phone, email, website,
        status, latitude, longitude, facilities,
        company_id AS "companyId",
        total_holes AS "totalHoles",
        total_courses AS "totalCourses",
        club_type AS "clubType",
        operating_hours AS "operatingHours",
        season_info AS "seasonInfo",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )) AS distance
      FROM clubs
      WHERE is_active = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )) <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT ${limit}
    `)) as unknown as (Club & { distance: number })[];

    return clubRows.map((club) => {
      const resDto = ClubResponseDto.fromEntity(club);
      return {
        ...resDto,
        distance: Math.round(club.distance * 100) / 100,
      };
    });
  }

}
