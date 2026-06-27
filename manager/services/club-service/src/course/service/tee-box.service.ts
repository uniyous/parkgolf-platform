import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, ne, asc, ilike } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { teeBoxes, holes } from '../../db/schema';
import type { TeeBox } from '../../db/schema';
import { CreateTeeBoxDto, FindTeeBoxesQueryDto, UpdateTeeBoxDto } from '../dto/tee-box.dto';

@Injectable()
export class TeeBoxService {
  private readonly logger = new Logger(TeeBoxService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(holeId: number, createDto: CreateTeeBoxDto): Promise<TeeBox> {
    this.logger.log(`Attempting to create a tee box for hole ID: ${holeId}, Name: ${createDto.name}`);

    // Hole 존재 여부 확인
    const [hole] = await this.db.select().from(holes).where(eq(holes.id, holeId)).limit(1);
    if (!hole) {
      throw new NotFoundException(`Hole with ID ${holeId} not found.`);
    }

    // (선택적) 같은 홀 내에서 티박스 이름 중복 방지
    const [existingTeeBoxWithName] = await this.db
      .select()
      .from(teeBoxes)
      .where(and(eq(teeBoxes.holeId, holeId), eq(teeBoxes.name, createDto.name)))
      .limit(1);
    if (existingTeeBoxWithName) {
      throw new ConflictException(`A tee box with name "${createDto.name}" already exists for hole ID ${holeId}.`);
    }

    const [row] = await this.db
      .insert(teeBoxes)
      .values({
        ...createDto,
        holeId: holeId,
      })
      .returning();
    return row;
  }

  async findAllByHoleId(holeId: number, query: FindTeeBoxesQueryDto): Promise<TeeBox[]> {
    this.logger.log(`Fetching tee boxes for hole ID: ${holeId} with query: ${JSON.stringify(query)}`);
    const { name } = query;

    const conditions = [eq(teeBoxes.holeId, holeId)];
    if (name) {
      conditions.push(ilike(teeBoxes.name, `%${name}%`));
    }

    return this.db
      .select()
      .from(teeBoxes)
      .where(and(...conditions))
      .orderBy(asc(teeBoxes.name));
  }

  async findOne(holeId: number, teeBoxId: number): Promise<TeeBox> {
    this.logger.log(`Fetching tee box with ID: ${teeBoxId} for hole ID: ${holeId}`);
    const [teeBox] = await this.db.select().from(teeBoxes).where(eq(teeBoxes.id, teeBoxId)).limit(1);

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
      const [existingTeeBoxWithName] = await this.db
        .select()
        .from(teeBoxes)
        .where(
          and(
            eq(teeBoxes.holeId, holeId),
            eq(teeBoxes.name, updateDto.name),
            ne(teeBoxes.id, teeBoxId), // 현재 업데이트 중인 티박스는 제외
          ),
        )
        .limit(1);
      if (existingTeeBoxWithName) {
        throw new ConflictException(`A tee box with name "${updateDto.name}" already exists for hole ID ${holeId}.`);
      }
    }

    const [row] = await this.db
      .update(teeBoxes)
      .set({
        name: updateDto.name,
        color: updateDto.color,
        distance: updateDto.distance,
        difficulty: updateDto.difficulty,
      })
      .where(eq(teeBoxes.id, teeBoxId))
      .returning();
    return row;
  }

  async remove(holeId: number, teeBoxId: number): Promise<TeeBox> {
    this.logger.log(`Attempting to delete tee box with ID: ${teeBoxId} for hole ID: ${holeId}`);
    // 해당 티박스가 요청된 홀에 속하는지 확인
    await this.findOne(holeId, teeBoxId);

    const [row] = await this.db.delete(teeBoxes).where(eq(teeBoxes.id, teeBoxId)).returning();
    if (!row) {
      throw new NotFoundException(`Tee box with ID ${teeBoxId} not found.`);
    }
    return row;
  }
}
