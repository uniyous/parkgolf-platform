import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HoleService } from '../service/hole.service';
import { CreateHoleDto, FindHolesQueryDto, HoleResponseDto, UpdateHoleDto } from '../dto/hole.dto';

@ApiTags('Courses - Holes')
@Controller('api/courses/:courseId/holes') // 특정 코스에 속한 홀들을 관리
export class HoleController {
  constructor(private readonly holeService: HoleService) {}

  @Post()
  @ApiOperation({ summary: '새로운 홀 생성' })
  @ApiResponse({ status: 201, description: '홀 생성 성공', type: HoleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 번호의 홀 존재 (해당 코스 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Param('courseId', ParseIntPipe) courseId: number, @Body() createDto: CreateHoleDto): Promise<HoleResponseDto> {
    const hole = await this.holeService.create(courseId, createDto);
    return HoleResponseDto.fromEntity(hole);
  }

  @Get()
  @ApiOperation({ summary: '특정 코스의 모든 홀 목록 조회 (필터링 가능)' })
  @ApiResponse({ status: 200, description: '홀 목록 반환', type: [HoleResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(@Param('courseId', ParseIntPipe) courseId: number, @Query() query: FindHolesQueryDto): Promise<HoleResponseDto[]> {
    const holes = await this.holeService.findAllByCourseId(courseId, query);
    return holes.map((hole) => HoleResponseDto.fromEntity(hole));
  }

  @Get(':holeId')
  @ApiOperation({ summary: 'ID로 특정 홀 조회' })
  @ApiResponse({ status: 200, description: '홀 정보 반환', type: HoleResponseDto })
  @ApiResponse({ status: 404, description: '홀 또는 코스 없음' })
  async findOne(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
  ): Promise<HoleResponseDto> {
    const hole = await this.holeService.findOne(courseId, holeId);
    return HoleResponseDto.fromEntity(hole);
  }

  @Patch(':holeId')
  @ApiOperation({ summary: 'ID로 특정 홀 정보 수정' })
  @ApiResponse({ status: 200, description: '홀 수정 성공', type: HoleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '홀 또는 코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 번호의 홀 존재 (해당 코스 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
    @Body() updateDto: UpdateHoleDto,
  ): Promise<HoleResponseDto> {
    const hole = await this.holeService.update(courseId, holeId, updateDto);
    return HoleResponseDto.fromEntity(hole);
  }

  @Delete(':holeId')
  @ApiOperation({ summary: 'ID로 특정 홀 삭제' })
  @ApiResponse({ status: 204, description: '홀 삭제 성공' })
  @ApiResponse({ status: 404, description: '홀 또는 코스 없음' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('courseId', ParseIntPipe) courseId: number, @Param('holeId', ParseIntPipe) holeId: number): Promise<void> {
    await this.holeService.remove(courseId, holeId);
  }
}
