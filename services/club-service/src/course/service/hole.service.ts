import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Hole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateHoleDto, FindHolesQueryDto, UpdateHoleDto } from '../dto/hole.dto';

@Injectable()
export class HoleService {
  private readonly logger = new Logger(HoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: number, createDto: CreateHoleDto): Promise<Hole> {
    this.logger.log(`Attempting to create a hole for course ID: ${courseId}, Hole No: ${createDto.holeNumber}`);

    // Course 존재 여부 확인
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(` course with ID ${courseId} not found.`);
    }

    try {
      return await this.prisma.hole.create({
        data: {
          ...createDto,
          courseId: courseId, // 경로에서 받은 courseId 사용
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Hole number ${createDto.holeNumber} already exists for course ID ${courseId}.`);
      }
      throw error;
    }
  }

  async findAllByCourseId(courseId: number, query: FindHolesQueryDto): Promise<Hole[]> {
    this.logger.log(`Fetching holes for course ID: ${courseId} with query: ${JSON.stringify(query)}`);
    const { holeNumber, par } = query;

    const where: Prisma.HoleWhereInput = {
      courseId: courseId,
    };
    if (holeNumber) {
      where.holeNumber = holeNumber;
    }
    if (par) {
      where.par = par;
    }

    return this.prisma.hole.findMany({
      where,
      orderBy: { holeNumber: 'asc' },
      include: { teeBoxes: true },
    });
  }

  async findOne(courseId: number, holeId: number): Promise<Hole> {
    this.logger.log(`Fetching hole with ID: ${holeId} for course ID: ${courseId}`);
    const hole = await this.prisma.hole.findUnique({
      where: {
        id: holeId,
      },
      include: {
        teeBoxes: true,
        course: true,
      },
    });

    if (!hole) {
      throw new NotFoundException(`Hole with ID ${holeId} not found.`);
    }
    if (hole.courseId !== courseId) {
      throw new NotFoundException(`Hole with ID ${holeId} does not belong to course ID ${courseId}.`);
    }
    return hole;
  }

  async update(courseId: number, holeId: number, updateDto: UpdateHoleDto): Promise<Hole> {
    this.logger.log(`Attempting to update hole with ID: ${holeId} for course ID: ${courseId}`);

    // 먼저 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(courseId, holeId);

    // 만약 holeNumber를 변경하려고 하고, 해당 번호가 이미 코스 내에 존재하면 에러
    if (updateDto.holeNumber) {
      const existingHoleWithSameNumber = await this.prisma.hole.findUnique({
        where: {
          courseId_holeNumber: {
            courseId: courseId,
            holeNumber: updateDto.holeNumber,
          },
        },
      });
      // 만약 찾았는데, 그게 지금 업데이트하려는 홀(holeId)이 아니라면 중복임
      if (existingHoleWithSameNumber && existingHoleWithSameNumber.id !== holeId) {
        throw new ConflictException(`Hole number ${updateDto.holeNumber} already exists for course ID ${courseId}.`);
      }
    }

    return this.prisma.hole.update({
      where: { id: holeId },
      data: {
        holeNumber: updateDto.holeNumber,
        par: updateDto.par,
        distance: updateDto.distance,
        handicap: updateDto.handicap,
        description: updateDto.description,
        tips: updateDto.tips,
        imageUrl: updateDto.imageUrl,
      },
    });
  }

  async remove(courseId: number, holeId: number): Promise<Hole> {
    this.logger.log(`Attempting to delete hole with ID: ${holeId} for course ID: ${courseId}`);
    // 해당 홀이 요청된 코스에 속하는지 확인 (findOne 메소드 재활용)
    await this.findOne(courseId, holeId);

    // onDelete: Cascade 이므로, 관련된 TeeBox도 함께 삭제됨
    try {
      return await this.prisma.hole.delete({
        where: { id: holeId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Hole with ID ${holeId} not found.`);
      }
      throw error;
    }
  }
}
