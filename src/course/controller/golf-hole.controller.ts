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
import { GolfHoleService } from '../service/golf-hole.service';
import { CreateGolfHoleDto, FindGolfHolesQueryDto, GolfHoleResponseDto, UpdateGolfHoleDto } from '../dto/golf-hole.dto';

@ApiTags('Golf Courses - Holes')
@Controller('api/golf-courses/:golfCourseId/holes') // 특정 골프 코스에 속한 홀들을 관리
export class GolfHoleController {
  constructor(private readonly golfHoleService: GolfHoleService) {}

  @Post()
  @ApiOperation({ summary: '새로운 골프 홀 생성' })
  @ApiResponse({ status: 201, description: '골프 홀 생성 성공', type: GolfHoleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 번호의 홀 존재 (해당 코스 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Param('golfCourseId', ParseIntPipe) golfCourseId: number, @Body() createDto: CreateGolfHoleDto): Promise<GolfHoleResponseDto> {
    const golfHole = await this.golfHoleService.create(golfCourseId, createDto);
    return GolfHoleResponseDto.fromEntity(golfHole);
  }

  @Get()
  @ApiOperation({ summary: '특정 골프 코스의 모든 홀 목록 조회 (필터링 가능)' })
  @ApiResponse({ status: 200, description: '골프 홀 목록 반환', type: [GolfHoleResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(@Param('golfCourseId', ParseIntPipe) golfCourseId: number, @Query() query: FindGolfHolesQueryDto): Promise<GolfHoleResponseDto[]> {
    const golfHoles = await this.golfHoleService.findAllByGolfCourseId(golfCourseId, query);
    return golfHoles.map((hole) => GolfHoleResponseDto.fromEntity(hole));
  }

  @Get(':holeId')
  @ApiOperation({ summary: 'ID로 특정 골프 홀 조회' })
  @ApiResponse({ status: 200, description: '골프 홀 정보 반환', type: GolfHoleResponseDto })
  @ApiResponse({ status: 404, description: '골프 홀 또는 코스 없음' })
  async findOne(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
  ): Promise<GolfHoleResponseDto> {
    const golfHole = await this.golfHoleService.findOne(golfCourseId, holeId);
    return GolfHoleResponseDto.fromEntity(golfHole);
  }

  @Patch(':holeId')
  @ApiOperation({ summary: 'ID로 특정 골프 홀 정보 수정' })
  @ApiResponse({ status: 200, description: '골프 홀 수정 성공', type: GolfHoleResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 홀 또는 코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 번호의 홀 존재 (해당 코스 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
    @Body() updateDto: UpdateGolfHoleDto,
  ): Promise<GolfHoleResponseDto> {
    const golfHole = await this.golfHoleService.update(golfCourseId, holeId, updateDto);
    return GolfHoleResponseDto.fromEntity(golfHole);
  }

  @Delete(':holeId')
  @ApiOperation({ summary: 'ID로 특정 골프 홀 삭제' })
  @ApiResponse({ status: 204, description: '골프 홀 삭제 성공' })
  @ApiResponse({ status: 404, description: '골프 홀 또는 코스 없음' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('golfCourseId', ParseIntPipe) golfCourseId: number, @Param('holeId', ParseIntPipe) holeId: number): Promise<void> {
    await this.golfHoleService.remove(golfCourseId, holeId);
  }
}
