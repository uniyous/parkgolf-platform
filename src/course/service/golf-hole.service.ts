import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GolfHole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGolfHoleDto, FindGolfHolesQueryDto, UpdateGolfHoleDto } from '../dto/golf-hole.dto';

@Injectable()
export class GolfHoleService {
  private readonly logger = new Logger(GolfHoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(golfCourseId: number, createDto: CreateGolfHoleDto): Promise<GolfHole> {
    this.logger.log(`Attempting to create a golf hole for course ID: ${golfCourseId}, Hole No: ${createDto.holeNumber}`);

    // GolfCourse 존재 여부 확인
    const golfCourse = await this.prisma.golfCourse.findUnique({
      where: { id: golfCourseId },
    });
    if (!golfCourse) {
      throw new NotFoundException(`Golf course with ID ${golfCourseId} not found.`);
    }

    try {
      return await this.prisma.golfHole.create({
        data: {
          ...createDto,
          golfCourseId: golfCourseId, // 경로에서 받은 golfCourseId 사용
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Golf hole number ${createDto.holeNumber} already exists for course ID ${golfCourseId}.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to create golf hole: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to create golf hole: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async findAllByGolfCourseId(golfCourseId: number, query: FindGolfHolesQueryDto): Promise<GolfHole[]> {
    this.logger.log(`Fetching golf holes for course ID: ${golfCourseId} with query: ${JSON.stringify(query)}`);
    const { holeNumber, par } = query;

    const where: Prisma.GolfHoleWhereInput = {
      golfCourseId: golfCourseId,
    };
    if (holeNumber) {
      where.holeNumber = holeNumber;
    }
    if (par) {
      where.par = par;
    }

    return this.prisma.golfHole.findMany({
      where,
      orderBy: { holeNumber: 'asc' },
      // include: { golfTeeBoxes: true }, // 필요시 티박스 정보 포함
    });
  }

  async findOne(golfCourseId: number, holeId: number): Promise<GolfHole> {
    this.logger.log(`Fetching golf hole with ID: ${holeId} for course ID: ${golfCourseId}`);
    const golfHole = await this.prisma.golfHole.findUnique({
      where: {
        id: holeId,
        // AND golfCourseId: golfCourseId // Prisma 5.8.0+ extendedWhereUnique 또는 복합 ID 사용 시 가능
        // 현재는 아래와 같이 조회 후 golfCourseId 확인
      },
      // include: { golfTeeBoxes: true },
    });

    if (!golfHole) {
      throw new NotFoundException(`Golf hole with ID ${holeId} not found.`);
    }
    if (golfHole.golfCourseId !== golfCourseId) {
      // 요청한 golfCourseId와 실제 홀의 golfCourseId가 다르면 권한 문제 또는 잘못된 요청
      throw new NotFoundException(`Golf hole with ID ${holeId} does not belong to course ID ${golfCourseId}.`);
    }
    return golfHole;
  }

  async update(golfCourseId: number, holeId: number, updateDto: UpdateGolfHoleDto): Promise<GolfHole> {
    this.logger.log(`Attempting to update golf hole with ID: ${holeId} for course ID: ${golfCourseId}`);

    // 먼저 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(golfCourseId, holeId);

    // 만약 holeNumber를 변경하려고 하고, 해당 번호가 이미 코스 내에 존재하면 에러
    if (updateDto.holeNumber) {
      const existingHoleWithSameNumber = await this.prisma.golfHole.findUnique({
        where: {
          golfCourseId_holeNumber: {
            golfCourseId: golfCourseId,
            holeNumber: updateDto.holeNumber,
          },
        },
      });
      // 만약 찾았는데, 그게 지금 업데이트하려는 홀(holeId)이 아니라면 중복임
      if (existingHoleWithSameNumber && existingHoleWithSameNumber.id !== holeId) {
        throw new ConflictException(`Golf hole number ${updateDto.holeNumber} already exists for course ID ${golfCourseId}.`);
      }
    }

    try {
      return await this.prisma.golfHole.update({
        where: { id: holeId }, // golfCourseId 조건은 위에서 이미 확인됨
        data: {
          // golfCourseId는 변경하지 않음
          holeNumber: updateDto.holeNumber,
          par: updateDto.par,
          distance: updateDto.distance,
          mapUrl: updateDto.mapUrl,
          description: updateDto.description,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update golf hole ID ${holeId}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to update golf hole ID ${holeId}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async remove(golfCourseId: number, holeId: number): Promise<GolfHole> {
    this.logger.log(`Attempting to delete golf hole with ID: ${holeId} for course ID: ${golfCourseId}`);
    // 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(golfCourseId, holeId);

    // onDelete: Cascade 이므로, 관련된 GolfTeeBox도 함께 삭제됨
    try {
      return await this.prisma.golfHole.delete({
        where: { id: holeId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record to delete not found (이미 findOne에서 처리됨)
          throw new NotFoundException(`Golf hole with ID ${holeId} not found.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to delete golf hole ID ${holeId}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to delete golf hole ID ${holeId}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
