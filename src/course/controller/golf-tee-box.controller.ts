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
import { GolfTeeBoxService } from '../service/golf-tee-box.service';
import { CreateGolfTeeBoxDto, FindGolfTeeBoxesQueryDto, GolfTeeBoxResponseDto, UpdateGolfTeeBoxDto } from '../dto/golf-tee-box.dto';

@ApiTags('Golf Courses - Holes - Tee Boxes')
// 경로는 골프 코스 -> 홀 -> 티박스 순으로 중첩
@Controller('api/golf-courses/:golfCourseId/holes/:golfHoleId/tee-boxes')
export class GolfTeeBoxController {
  constructor(private readonly teeBoxService: GolfTeeBoxService) {}

  @Post()
  @ApiOperation({ summary: '새로운 골프 티박스 생성' })
  @ApiResponse({ status: 201, description: '티박스 생성 성공', type: GolfTeeBoxResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 홀 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 이름의 티박스 존재 (해당 홀 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number, // 경로에서 golfCourseId는 사용되진 않지만, API 경로 일관성을 위해 유지
    @Param('golfHoleId', ParseIntPipe) golfHoleId: number,
    @Body() createDto: CreateGolfTeeBoxDto,
  ): Promise<GolfTeeBoxResponseDto> {
    // golfCourseId 파라미터는 서비스 로직에서 golfHoleId를 통해 간접적으로 검증될 수 있음
    const teeBox = await this.teeBoxService.create(golfHoleId, createDto);
    return GolfTeeBoxResponseDto.fromEntity(teeBox);
  }

  @Get()
  @ApiOperation({ summary: '특정 골프 홀의 모든 티박스 목록 조회 (필터링 가능)' })
  @ApiResponse({ status: 200, description: '티박스 목록 반환', type: [GolfTeeBoxResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number, // 서비스에서 golfHoleId만 사용하므로, 이 파라미터는 경로 일관성용
    @Param('golfHoleId', ParseIntPipe) golfHoleId: number,
    @Query() query: FindGolfTeeBoxesQueryDto,
  ): Promise<GolfTeeBoxResponseDto[]> {
    const teeBoxes = await this.teeBoxService.findAllByGolfHoleId(golfHoleId, query);
    return teeBoxes.map((teeBox) => GolfTeeBoxResponseDto.fromEntity(teeBox));
  }

  @Get(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 골프 티박스 조회' })
  @ApiResponse({ status: 200, description: '티박스 정보 반환', type: GolfTeeBoxResponseDto })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  async findOne(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Param('golfHoleId', ParseIntPipe) golfHoleId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
  ): Promise<GolfTeeBoxResponseDto> {
    const teeBox = await this.teeBoxService.findOne(golfHoleId, teeBoxId);
    // golfCourseId에 대한 검증은 findOne 서비스 메소드 내에서 golfHoleId를 통해 간접적으로 이루어짐
    return GolfTeeBoxResponseDto.fromEntity(teeBox);
  }

  @Patch(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 골프 티박스 정보 수정' })
  @ApiResponse({ status: 200, description: '티박스 수정 성공', type: GolfTeeBoxResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 이름의 티박스 존재 (해당 홀 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Param('golfHoleId', ParseIntPipe) golfHoleId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
    @Body() updateDto: UpdateGolfTeeBoxDto,
  ): Promise<GolfTeeBoxResponseDto> {
    const teeBox = await this.teeBoxService.update(golfHoleId, teeBoxId, updateDto);
    return GolfTeeBoxResponseDto.fromEntity(teeBox);
  }

  @Delete(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 골프 티박스 삭제' })
  @ApiResponse({ status: 204, description: '티박스 삭제 성공' })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('golfCourseId', ParseIntPipe) golfCourseId: number,
    @Param('golfHoleId', ParseIntPipe) golfHoleId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
  ): Promise<void> {
    await this.teeBoxService.remove(golfHoleId, teeBoxId);
  }
}
