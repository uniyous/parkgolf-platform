import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GolfTeeBox, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGolfTeeBoxDto, FindGolfTeeBoxesQueryDto, UpdateGolfTeeBoxDto } from '../dto/golf-tee-box.dto';

@Injectable()
export class GolfTeeBoxService {
  private readonly logger = new Logger(GolfTeeBoxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(golfHoleId: number, createDto: CreateGolfTeeBoxDto): Promise<GolfTeeBox> {
    this.logger.log(`Attempting to create a tee box for hole ID: ${golfHoleId}, Name: ${createDto.name}`);

    // GolfHole 존재 여부 확인
    const golfHole = await this.prisma.golfHole.findUnique({
      where: { id: golfHoleId },
    });
    if (!golfHole) {
      throw new NotFoundException(`Golf hole with ID ${golfHoleId} not found.`);
    }

    // (선택적) 같은 홀 내에서 티박스 이름 중복 방지
    const existingTeeBoxWithName = await this.prisma.golfTeeBox.findFirst({
      where: {
        golfHoleId: golfHoleId,
        name: createDto.name,
      },
    });
    if (existingTeeBoxWithName) {
      throw new ConflictException(`A tee box with name "${createDto.name}" already exists for hole ID ${golfHoleId}.`);
    }

    try {
      return await this.prisma.golfTeeBox.create({
        data: {
          ...createDto,
          golfHoleId: golfHoleId, // 경로에서 받은 golfHoleId 사용
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create tee box: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to create tee box: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async findAllByGolfHoleId(golfHoleId: number, query: FindGolfTeeBoxesQueryDto): Promise<GolfTeeBox[]> {
    this.logger.log(`Fetching tee boxes for hole ID: ${golfHoleId} with query: ${JSON.stringify(query)}`);
    const { name } = query;

    const where: Prisma.GolfTeeBoxWhereInput = {
      golfHoleId: golfHoleId,
    };
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    return this.prisma.golfTeeBox.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(golfHoleId: number, teeBoxId: number): Promise<GolfTeeBox> {
    this.logger.log(`Fetching tee box with ID: ${teeBoxId} for hole ID: ${golfHoleId}`);
    const teeBox = await this.prisma.golfTeeBox.findUnique({
      where: { id: teeBoxId },
    });

    if (!teeBox) {
      throw new NotFoundException(`Tee box with ID ${teeBoxId} not found.`);
    }
    if (teeBox.golfHoleId !== golfHoleId) {
      throw new NotFoundException(`Tee box with ID ${teeBoxId} does not belong to hole ID ${golfHoleId}.`);
    }
    return teeBox;
  }

  async update(golfHoleId: number, teeBoxId: number, updateDto: UpdateGolfTeeBoxDto): Promise<GolfTeeBox> {
    this.logger.log(`Attempting to update tee box with ID: ${teeBoxId} for hole ID: ${golfHoleId}`);

    // 해당 티박스가 요청된 홀에 속하는지 확인
    await this.findOne(golfHoleId, teeBoxId);

    // (선택적) 이름 변경 시 해당 홀 내 다른 티박스와 이름 중복 체크
    if (updateDto.name) {
      const existingTeeBoxWithName = await this.prisma.golfTeeBox.findFirst({
        where: {
          golfHoleId: golfHoleId,
          name: updateDto.name,
          NOT: { id: teeBoxId }, // 현재 업데이트 중인 티박스는 제외
        },
      });
      if (existingTeeBoxWithName) {
        throw new ConflictException(`A tee box with name "${updateDto.name}" already exists for hole ID ${golfHoleId}.`);
      }
    }

    try {
      return await this.prisma.golfTeeBox.update({
        where: { id: teeBoxId },
        data: {
          // golfHoleId는 변경하지 않음
          name: updateDto.name,
          distance: updateDto.distance,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update tee box ID ${teeBoxId}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to update tee box ID ${teeBoxId}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }

  async remove(golfHoleId: number, teeBoxId: number): Promise<GolfTeeBox> {
    this.logger.log(`Attempting to delete tee box with ID: ${teeBoxId} for hole ID: ${golfHoleId}`);
    // 해당 티박스가 요청된 홀에 속하는지 확인
    await this.findOne(golfHoleId, teeBoxId);

    try {
      return await this.prisma.golfTeeBox.delete({
        where: { id: teeBoxId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record to delete not found
          throw new NotFoundException(`Tee box with ID ${teeBoxId} not found.`);
        }
      } else if (error instanceof Error) {
        this.logger.error(`Failed to delete tee box ID ${teeBoxId}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Failed to delete tee box ID ${teeBoxId}: ${JSON.stringify(error)}`);
      }
      throw error;
    }
  }
}
