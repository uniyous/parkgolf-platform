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
import { TeeBoxService } from '../service/tee-box.service';
import { CreateTeeBoxDto, FindTeeBoxesQueryDto, TeeBoxResponseDto, UpdateTeeBoxDto } from '../dto/tee-box.dto';

@ApiTags('Courses - Holes - Tee Boxes')
// 경로는 코스 -> 홀 -> 티박스 순으로 중첩
@Controller('api/courses/:courseId/holes/:holeId/tee-boxes')
export class TeeBoxController {
  constructor(private readonly teeBoxService: TeeBoxService) {}

  @Post()
  @ApiOperation({ summary: '새로운 티박스 생성' })
  @ApiResponse({ status: 201, description: '티박스 생성 성공', type: TeeBoxResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '홀 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 이름의 티박스 존재 (해당 홀 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(
    @Param('courseId', ParseIntPipe) courseId: number, // 경로에서 courseId는 사용되진 않지만, API 경로 일관성을 위해 유지
    @Param('holeId', ParseIntPipe) holeId: number,
    @Body() createDto: CreateTeeBoxDto,
  ): Promise<TeeBoxResponseDto> {
    // courseId 파라미터는 서비스 로직에서 holeId를 통해 간접적으로 검증될 수 있음
    const teeBox = await this.teeBoxService.create(holeId, createDto);
    return TeeBoxResponseDto.fromEntity(teeBox);
  }

  @Get()
  @ApiOperation({ summary: '특정 홀의 모든 티박스 목록 조회 (필터링 가능)' })
  @ApiResponse({ status: 200, description: '티박스 목록 반환', type: [TeeBoxResponseDto] })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(
    @Param('courseId', ParseIntPipe) courseId: number, // 서비스에서 holeId만 사용하므로, 이 파라미터는 경로 일관성용
    @Param('holeId', ParseIntPipe) holeId: number,
    @Query() query: FindTeeBoxesQueryDto,
  ): Promise<TeeBoxResponseDto[]> {
    const teeBoxes = await this.teeBoxService.findAllByHoleId(holeId, query);
    return teeBoxes.map((teeBox) => TeeBoxResponseDto.fromEntity(teeBox));
  }

  @Get(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 티박스 조회' })
  @ApiResponse({ status: 200, description: '티박스 정보 반환', type: TeeBoxResponseDto })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  async findOne(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
  ): Promise<TeeBoxResponseDto> {
    const teeBox = await this.teeBoxService.findOne(holeId, teeBoxId);
    // courseId에 대한 검증은 findOne 서비스 메소드 내에서 holeId를 통해 간접적으로 이루어짐
    return TeeBoxResponseDto.fromEntity(teeBox);
  }

  @Patch(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 티박스 정보 수정' })
  @ApiResponse({ status: 200, description: '티박스 수정 성공', type: TeeBoxResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  @ApiResponse({ status: 409, description: '이미 해당 이름의 티박스 존재 (해당 홀 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
    @Body() updateDto: UpdateTeeBoxDto,
  ): Promise<TeeBoxResponseDto> {
    const teeBox = await this.teeBoxService.update(holeId, teeBoxId, updateDto);
    return TeeBoxResponseDto.fromEntity(teeBox);
  }

  @Delete(':teeBoxId')
  @ApiOperation({ summary: 'ID로 특정 티박스 삭제' })
  @ApiResponse({ status: 204, description: '티박스 삭제 성공' })
  @ApiResponse({ status: 404, description: '티박스 또는 홀/코스 없음' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('holeId', ParseIntPipe) holeId: number,
    @Param('teeBoxId', ParseIntPipe) teeBoxId: number,
  ): Promise<void> {
    await this.teeBoxService.remove(holeId, teeBoxId);
  }
}
