import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Club } from '@prisma/client';
import {
  CreateClubDto,
  UpdateClubDto,
  ClubFilterDto,
  ClubWithRelations,
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 골프클럽 생성
   */
  async create(createClubDto: CreateClubDto): Promise<ClubWithRelations> {
    try {
      // Note: Company validation should be done via NATS 'iam.companies.getById' if needed
      // companyId is a cross-database reference to iam_db.companies

      // 같은 회사 내에서 클럽명 중복 확인
      const existingClub = await this.prisma.club.findFirst({
        where: {
          companyId: createClubDto.companyId,
          name: createClubDto.name,
        },
      });

      if (existingClub) {
        throw new BadRequestException('Club with this name already exists in the company');
      }

      const club = await this.prisma.club.create({
        data: {
          ...createClubDto,
          operatingHours: createClubDto.operatingHours ? JSON.parse(JSON.stringify(createClubDto.operatingHours)) : undefined,
          seasonInfo: createClubDto.seasonInfo ? JSON.parse(JSON.stringify(createClubDto.seasonInfo)) : undefined,
          facilities: createClubDto.facilities || [],
        },
        include: {
          // company relation removed - use NATS 'iam.companies.getById' for Company data
          courses: {
            include: {
              holes: true,
            },
          },
        },
      });

      this.logger.log(`Club created: ${club.name} (ID: ${club.id})`);
      return club;
    } catch (error) {
      this.logger.error(`Failed to create club: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 골프클럽 목록 조회 (필터링, 페이징 지원)
   */
  async findAll(filters: ClubFilterDto): Promise<ClubListResult> {
    try {
      const {
        search,
        location,
        status,
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
      const where: Prisma.ClubWhereInput = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(location && { location: { contains: location, mode: 'insensitive' } }),
        ...(status && { status }),
        ...(minHoles && { totalHoles: { gte: minHoles } }),
        ...(maxHoles && { totalHoles: { lte: maxHoles } }),
        ...(facilities && facilities.length > 0 && {
          facilities: { hasEvery: facilities },
        }),
      };

      // 정렬 조건
      const orderBy: Prisma.ClubOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // 총 개수 조회
      const total = await this.prisma.club.count({ where });

      // 페이징 계산
      const skip = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum);

      // 데이터 조회
      const clubs = await this.prisma.club.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          // company relation removed - use NATS 'iam.companies.getById' for Company data
          courses: true,
        },
      });

      return {
        data: clubs,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch clubs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 골프클럽 상세 조회
   */
  async findOne(id: number): Promise<ClubWithRelations> {
    try {
      const club = await this.prisma.club.findUnique({
        where: { id, isActive: true },
        include: {
          // company relation removed - use NATS 'iam.companies.getById' for Company data
          courses: {
            include: {
              holes: {
                include: {
                  teeBoxes: true,
                },
              },
            },
          },
        },
      });

      if (!club) {
        throw new NotFoundException(`Club with ID ${id} not found`);
      }

      return club;
    } catch (error) {
      this.logger.error(`Failed to fetch club ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 골프클럽 수정
   */
  async update(id: number, updateClubDto: UpdateClubDto): Promise<ClubWithRelations> {
    try {
      // 클럽 존재 여부 확인
      const existingClub = await this.prisma.club.findUnique({
        where: { id, isActive: true },
      });

      if (!existingClub) {
        throw new NotFoundException(`Club with ID ${id} not found`);
      }

      // Note: Company validation should be done via NATS 'iam.companies.getById' if needed
      // companyId is a cross-database reference to iam_db.companies

      // 이름 변경 시 중복 확인
      if (updateClubDto.name && updateClubDto.name !== existingClub.name) {
        const companyId = updateClubDto.companyId || existingClub.companyId;
        const duplicateClub = await this.prisma.club.findFirst({
          where: {
            companyId,
            name: updateClubDto.name,
            id: { not: id },
          },
        });

        if (duplicateClub) {
          throw new BadRequestException('Club with this name already exists in the company');
        }
      }

      const club = await this.prisma.club.update({
        where: { id },
        data: {
          ...updateClubDto,
          operatingHours: updateClubDto.operatingHours ? JSON.parse(JSON.stringify(updateClubDto.operatingHours)) : undefined,
          seasonInfo: updateClubDto.seasonInfo ? JSON.parse(JSON.stringify(updateClubDto.seasonInfo)) : undefined,
        },
        include: {
          // company relation removed - use NATS 'iam.companies.getById' for Company data
          courses: {
            include: {
              holes: true,
            },
          },
        },
      });

      this.logger.log(`Club updated: ${club.name} (ID: ${club.id})`);
      return club;
    } catch (error) {
      this.logger.error(`Failed to update club ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 골프클럽 삭제 (soft delete)
   */
  async remove(id: number): Promise<void> {
    try {
      const club = await this.prisma.club.findUnique({
        where: { id, isActive: true },
      });

      if (!club) {
        throw new NotFoundException(`Club with ID ${id} not found`);
      }

      await this.prisma.club.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Club deleted: ${club.name} (ID: ${club.id})`);
    } catch (error) {
      this.logger.error(`Failed to delete club ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 회사별 골프클럽 목록 조회
   */
  async findByCompany(companyId: number): Promise<ClubWithRelations[]> {
    try {
      const clubs = await this.prisma.club.findMany({
        where: {
          companyId,
          isActive: true,
        },
        include: {
          // company relation removed - use NATS 'iam.companies.getById' for Company data
          courses: true,
        },
        orderBy: { name: 'asc' },
      });

      return clubs;
    } catch (error) {
      this.logger.error(`Failed to fetch clubs for company ${companyId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 골프클럽 통계 업데이트 (코스 추가/삭제 시 호출)
   */
  async updateStats(clubId: number): Promise<void> {
    try {
      const stats = await this.prisma.course.aggregate({
        where: {
          clubId,
          isActive: true,
        },
        _count: { id: true },
        _sum: { holeCount: true },
      });

      await this.prisma.club.update({
        where: { id: clubId },
        data: {
          totalCourses: stats._count.id || 0,
          totalHoles: stats._sum.holeCount || 0,
        },
      });

      this.logger.log(`Club stats updated for ID: ${clubId}`);
    } catch (error) {
      this.logger.error(`Failed to update club stats ${clubId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}