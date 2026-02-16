import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CoursesService } from './courses.service';

@ApiTags('Clubs')
@Controller('api/user/clubs')
export class ClubsController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get(':id')
  @ApiOperation({ summary: '골프장 상세 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '골프장 정보를 성공적으로 조회했습니다.',
  })
  @ApiResponse({ status: 404, description: '골프장을 찾을 수 없습니다.' })
  async getClubById(@Param('id') id: string) {
    return this.coursesService.getClubById(parseInt(id, 10));
  }
}
