import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CoursesService } from './courses.service';

@ApiTags('Courses')
@Controller('api/user/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('search')
  @ApiOperation({ summary: '코스 검색' })
  @ApiQuery({ name: 'keyword', required: false, description: '검색 키워드' })
  @ApiQuery({ name: 'location', required: false, description: '위치' })
  @ApiQuery({
    name: 'priceRange',
    required: false,
    description: '가격 범위',
    type: [Number],
  })
  @ApiQuery({ name: 'rating', required: false, description: '최소 평점' })
  @ApiResponse({
    status: 200,
    description: '코스 목록을 성공적으로 조회했습니다.',
  })
  async searchCourses(
    @Query('keyword') keyword?: string,
    @Query('location') location?: string,
    @Query('priceRange') priceRange?: number[],
    @Query('rating') rating?: number,
  ) {
    return this.coursesService.searchCourses({
      keyword,
      location,
      priceRange: priceRange as [number, number],
      rating,
    });
  }

  @Get()
  @ApiOperation({ summary: '전체 코스 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '코스 목록을 성공적으로 조회했습니다.',
  })
  async getAllCourses() {
    return this.coursesService.getAllCourses();
  }

  @Get(':id')
  @ApiOperation({ summary: '코스 상세 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '코스 정보를 성공적으로 조회했습니다.',
  })
  @ApiResponse({ status: 404, description: '코스를 찾을 수 없습니다.' })
  async getCourseById(@Param('id') id: string) {
    return this.coursesService.getCourseById(parseInt(id, 10));
  }
}
