import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeeBox, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTeeBoxDto, FindTeeBoxesQueryDto, UpdateTeeBoxDto } from '../dto/tee-box.dto';

@Injectable()
export class TeeBoxService {
  private readonly logger = new Logger(TeeBoxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(holeId: number, createDto: CreateTeeBoxDto): Promise<TeeBox> {
    this.logger.log(`Attempting to create a tee box for hole ID: ${holeId}, Name: ${createDto.name}`);

    // Hole 존재 여부 확인
    const hole = await this.prisma.hole.findUnique({
      where: { id: holeId },
    });
    if (!hole) {
      throw new NotFoundException(`Hole with ID ${holeId} not found.`);
    }

    // (선택적) 같은 홀 내에서 티박스 이름 중복 방지
    const existingTeeBoxWithName = await this.prisma.teeBox.findFirst({
      where: {
        holeId: holeId,
        name: createDto.name,
      },
    });
    if (existingTeeBoxWithName) {
      throw new ConflictException(`A tee box with name "${createDto.name}" already exists for hole ID ${holeId}.`);
    }

    return this.prisma.teeBox.create({
      data: {
        ...createDto,
        holeId: holeId,
      },
    });
  }

  async findAllByHoleId(holeId: number, query: FindTeeBoxesQueryDto): Promise<TeeBox[]> {
    this.logger.log(`Fetching tee boxes for hole ID: ${holeId} with query: ${JSON.stringify(query)}`);
    const { name } = query;

    const where: Prisma.TeeBoxWhereInput = {
      holeId: holeId,
    };
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    return this.prisma.teeBox.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(holeId: number, teeBoxId: number): Promise<TeeBox> {
    this.logger.log(`Fetching tee box with ID: ${teeBoxId} for hole ID: ${holeId}`);
    const teeBox = await this.prisma.teeBox.findUnique({
      where: { id: teeBoxId },
    });

    if (!teeBox) {
      throw new NotFoundException(`Tee box with ID ${teeBoxId} not found.`);
    }
    if (teeBox.holeId !== holeId) {
      throw new NotFoundException(`Tee box with ID ${teeBoxId} does not belong to hole ID ${holeId}.`);
    }
    return teeBox;
  }

  async update(holeId: number, teeBoxId: number, updateDto: UpdateTeeBoxDto): Promise<TeeBox> {
    this.logger.log(`Attempting to update tee box with ID: ${teeBoxId} for hole ID: ${holeId}`);

    // 해당 티박스가 요청된 홀에 속하는지 확인
    await this.findOne(holeId, teeBoxId);

    // (선택적) 이름 변경 시 해당 홀 내 다른 티박스와 이름 중복 체크
    if (updateDto.name) {
      const existingTeeBoxWithName = await this.prisma.teeBox.findFirst({
        where: {
          holeId: holeId,
          name: updateDto.name,
          NOT: { id: teeBoxId }, // 현재 업데이트 중인 티박스는 제외
        },
      });
      if (existingTeeBoxWithName) {
        throw new ConflictException(`A tee box with name "${updateDto.name}" already exists for hole ID ${holeId}.`);
      }
    }

    return this.prisma.teeBox.update({
      where: { id: teeBoxId },
      data: {
        name: updateDto.name,
        color: updateDto.color,
        distance: updateDto.distance,
        difficulty: updateDto.difficulty,
      },
    });
  }

  async remove(holeId: number, teeBoxId: number): Promise<TeeBox> {
    this.logger.log(`Attempting to delete tee box with ID: ${teeBoxId} for hole ID: ${holeId}`);
    // 해당 티박스가 요청된 홀에 속하는지 확인
    await this.findOne(holeId, teeBoxId);

    try {
      return await this.prisma.teeBox.delete({
        where: { id: teeBoxId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Tee box with ID ${teeBoxId} not found.`);
      }
      throw error;
    }
  }
}
