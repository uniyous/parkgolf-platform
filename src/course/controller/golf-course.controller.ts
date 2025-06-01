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
import { GolfCourseService } from '../service/golf-course.service';
import { CreateGolfCourseDto, FindGolfCoursesQueryDto, GolfCourseResponseDto, UpdateGolfCourseDto } from '../dto/golf-course.dto';

@ApiTags('Golf Courses')
@Controller('api/golf-courses')
export class GolfCourseController {
  constructor(private readonly golfCourseService: GolfCourseService) {}

  @Post()
  @ApiOperation({ summary: '새로운 골프 코스 생성' })
  @ApiResponse({ status: 201, description: '골프 코스 생성 성공', type: GolfCourseResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 회사 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 코스 이름 (해당 회사 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async create(@Body() createDto: CreateGolfCourseDto): Promise<GolfCourseResponseDto> {
    const golfCourse = await this.golfCourseService.create(createDto);
    return GolfCourseResponseDto.fromEntity(golfCourse);
  }

  @Get()
  @ApiOperation({ summary: '골프 코스 목록 조회 (페이지네이션 및 필터링 가능)' })
  @ApiResponse({ status: 200, description: '골프 코스 목록 반환' })
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  async findAll(@Query() query: FindGolfCoursesQueryDto): Promise<{ data: GolfCourseResponseDto[]; total: number; page: number; limit: number }> {
    const result = await this.golfCourseService.findAll(query);
    return {
      ...result,
      data: result.data.map((course) => GolfCourseResponseDto.fromEntity(course)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 특정 골프 코스 조회' })
  @ApiResponse({ status: 200, description: '골프 코스 정보 반환', type: GolfCourseResponseDto })
  @ApiResponse({ status: 404, description: '골프 코스 없음' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<GolfCourseResponseDto> {
    const golfCourse = await this.golfCourseService.findOne(id);
    return GolfCourseResponseDto.fromEntity(golfCourse);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ID로 특정 골프 코스 정보 수정' })
  @ApiResponse({ status: 200, description: '골프 코스 수정 성공', type: GolfCourseResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
  @ApiResponse({ status: 404, description: '골프 코스 또는 대상 회사 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 코스 이름 (해당 회사 내)' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, skipMissingProperties: true }))
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateGolfCourseDto): Promise<GolfCourseResponseDto> {
    const golfCourse = await this.golfCourseService.update(id, updateDto);
    return GolfCourseResponseDto.fromEntity(golfCourse);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ID로 특정 골프 코스 삭제' })
  @ApiResponse({ status: 204, description: '골프 코스 삭제 성공' })
  @ApiResponse({ status: 404, description: '골프 코스 없음' })
  @ApiResponse({ status: 409, description: '관련 데이터가 있어 삭제 불가' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.golfCourseService.remove(id);
  }
}
