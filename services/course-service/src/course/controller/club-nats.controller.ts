import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClubService } from '../service/club.service';
import {
  CreateClubDto,
  UpdateClubDto,
  ClubFilterDto,
  ClubResponseDto,
  ClubListResponseDto,
} from '../dto/club.dto';

@Controller()
export class ClubNatsController {
  private readonly logger = new Logger(ClubNatsController.name);

  constructor(private readonly clubService: ClubService) {}

  /**
   * 클럽 생성
   */
  @MessagePattern('club.create')
  async createGolfClub(@Payload() data: any): Promise<ClubResponseDto> {
    this.logger.log(`Creating club with data: ${JSON.stringify(data)}`);
    const { token, ...createGolfClubDto } = data;
    return await this.clubService.create(createGolfClubDto.data || createGolfClubDto);
  }

  /**
   * 클럽 목록 조회
   */
  @MessagePattern('club.findAll')
  async findAllGolfClubs(@Payload() data: any): Promise<ClubListResponseDto> {
    this.logger.log(`Finding clubs with data: ${JSON.stringify(data)}`);
    // Extract token if present and remove it from filters
    const { token, ...filters } = data;
    return await this.clubService.findAll(filters);
  }

  /**
   * 클럽 상세 조회
   */
  @MessagePattern('club.findOne')
  async findOneGolfClub(@Payload() data: any): Promise<ClubResponseDto> {
    this.logger.log(`Finding club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    return await this.clubService.findOne(params.id);
  }

  /**
   * 클럽 수정
   */
  @MessagePattern('club.update')
  async updateGolfClub(@Payload() data: any): Promise<ClubResponseDto> {
    this.logger.log(`Updating club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    return await this.clubService.update(params.id, params.updateClubDto);
  }

  /**
   * 클럽 삭제
   */
  @MessagePattern('club.remove')
  async removeGolfClub(@Payload() data: any): Promise<{ success: boolean }> {
    this.logger.log(`Removing club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    await this.clubService.remove(params.id);
    return { success: true };
  }

  /**
   * 회사별 클럽 목록 조회
   */
  @MessagePattern('club.findByCompany')
  async findGolfClubsByCompany(@Payload() data: any): Promise<ClubResponseDto[]> {
    this.logger.log(`Finding clubs by company with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    return await this.clubService.findByCompany(params.companyId);
  }

  /**
   * 클럽 통계 업데이트
   */
  @MessagePattern('club.updateStats')
  async updateGolfClubStats(@Payload() data: { clubId: number }): Promise<{ success: boolean }> {
    this.logger.log(`Updating stats for club ID: ${data.clubId}`);
    await this.clubService.updateStats(data.clubId);
    return { success: true };
  }

  /**
   * 클럽 검색 (간단한 이름/위치 검색)
   */
  @MessagePattern('club.search')
  async searchGolfClubs(@Payload() data: any): Promise<ClubResponseDto[]> {
    this.logger.log(`Searching clubs with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    
    const filters: ClubFilterDto = {
      search: params.query,
      limit: params.limit || 10,
      page: 1,
    };
    
    const result = await this.clubService.findAll(filters);
    return result.data;
  }

  /**
   * 인기 클럽 Top N 조회 (코스 수 기준)
   */
  @MessagePattern('club.findPopular')
  async findPopularGolfClubs(@Payload() data: { limit?: number }): Promise<ClubResponseDto[]> {
    this.logger.log(`Finding popular clubs (limit: ${data.limit || 10})`);
    
    const filters: ClubFilterDto = {
      sortBy: 'totalCourses',
      sortOrder: 'desc',
      limit: data.limit || 10,
      page: 1,
    };
    
    const result = await this.clubService.findAll(filters);
    return result.data;
  }

  /**
   * 클럽 상태별 개수 조회
   */
  @MessagePattern('club.getStatusCounts')
  async getGolfClubStatusCounts(): Promise<{ [key: string]: number }> {
    this.logger.log('Getting club status counts');
    
    // 전체 조회해서 상태별로 카운트 (실제 프로덕션에서는 더 효율적인 쿼리 사용)
    const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });
    
    const statusCounts = allGolfClubs.data.reduce((acc, club) => {
      acc[club.status] = (acc[club.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return statusCounts;
  }

  /**
   * 클럽 평균 통계 조회
   */
  @MessagePattern('club.getAverageStats')
  async getGolfClubAverageStats(): Promise<{
    averageHoles: number;
    averageCourses: number;
    totalGolfClubs: number;
  }> {
    this.logger.log('Getting club average statistics');
    
    const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });
    
    const totalGolfClubs = allGolfClubs.total;
    const totalHoles = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalHoles, 0);
    const totalCourses = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalCourses, 0);
    
    return {
      averageHoles: totalGolfClubs > 0 ? Math.round(totalHoles / totalGolfClubs) : 0,
      averageCourses: totalGolfClubs > 0 ? Math.round(totalCourses / totalGolfClubs) : 0,
      totalGolfClubs,
    };
  }
}