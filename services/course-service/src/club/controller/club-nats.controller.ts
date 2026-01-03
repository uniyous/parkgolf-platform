import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClubService } from '../service/club.service';
import { ClubFilterDto, CreateClubDto, UpdateClubDto, ClubResponseDto } from '../dto/club.dto';
import { ClubPayload, NatsResponse } from '../../common/types/response.types';

@Controller()
export class ClubNatsController {
  private readonly logger = new Logger(ClubNatsController.name);

  constructor(private readonly clubService: ClubService) {}

  @MessagePattern('club.create')
  async createGolfClub(@Payload() data: ClubPayload) {
    this.logger.log(`Creating club with data: ${JSON.stringify(data)}`);
    const { token, ...createGolfClubDto } = data;
    const club = await this.clubService.create((createGolfClubDto.data || createGolfClubDto) as CreateClubDto);
    return NatsResponse.success(ClubResponseDto.fromEntity(club));
  }

  @MessagePattern('club.findAll')
  async findAllGolfClubs(@Payload() data: ClubPayload & ClubFilterDto) {
    this.logger.log(`Finding clubs with data: ${JSON.stringify(data)}`);
    const { token, ...filters } = data;
    const result = await this.clubService.findAll(filters);
    const clubs = result.data.map(ClubResponseDto.fromEntity);
    return NatsResponse.paginated({ clubs }, result.total, result.page, result.limit);
  }

  @MessagePattern('club.findOne')
  async findOneGolfClub(@Payload() data: ClubPayload) {
    this.logger.log(`Finding club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    const club = await this.clubService.findOne(params.id);
    return NatsResponse.success(ClubResponseDto.fromEntity(club));
  }

  @MessagePattern('club.update')
  async updateGolfClub(@Payload() data: ClubPayload) {
    this.logger.log(`Updating club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    const club = await this.clubService.update(params.id!, params.updateClubDto as UpdateClubDto);
    return NatsResponse.success(ClubResponseDto.fromEntity(club));
  }

  @MessagePattern('club.remove')
  async removeGolfClub(@Payload() data: ClubPayload) {
    this.logger.log(`Removing club with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    await this.clubService.remove(params.id);
    return NatsResponse.deleted();
  }

  @MessagePattern('club.findByCompany')
  async findGolfClubsByCompany(@Payload() data: ClubPayload) {
    this.logger.log(`Finding clubs by company with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;
    const clubs = await this.clubService.findByCompany(params.companyId);
    return NatsResponse.success(clubs.map(ClubResponseDto.fromEntity));
  }

  @MessagePattern('club.updateStats')
  async updateGolfClubStats(@Payload() data: { clubId: number }) {
    this.logger.log(`Updating stats for club ID: ${data.clubId}`);
    await this.clubService.updateStats(data.clubId);
    return NatsResponse.success({ updated: true });
  }

  @MessagePattern('club.search')
  async searchGolfClubs(@Payload() data: ClubPayload) {
    this.logger.log(`Searching clubs with data: ${JSON.stringify(data)}`);
    const { token, ...params } = data;

    const filters: ClubFilterDto = {
      search: params.query,
      limit: params.limit || 10,
      page: 1,
    };

    const result = await this.clubService.findAll(filters);
    return NatsResponse.success(result.data.map(ClubResponseDto.fromEntity));
  }

  @MessagePattern('club.findPopular')
  async findPopularGolfClubs(@Payload() data: { limit?: number }) {
    this.logger.log(`Finding popular clubs (limit: ${data.limit || 10})`);

    const filters: ClubFilterDto = {
      sortBy: 'totalCourses',
      sortOrder: 'desc',
      limit: data.limit || 10,
      page: 1,
    };

    const result = await this.clubService.findAll(filters);
    return NatsResponse.success(result.data.map(ClubResponseDto.fromEntity));
  }

  @MessagePattern('club.getStatusCounts')
  async getGolfClubStatusCounts() {
    this.logger.log('Getting club status counts');
    const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });

    const statusCounts = allGolfClubs.data.reduce((acc, club) => {
      acc[club.status] = (acc[club.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return NatsResponse.success(statusCounts);
  }

  @MessagePattern('club.getAverageStats')
  async getGolfClubAverageStats() {
    this.logger.log('Getting club average statistics');
    const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });

    const totalGolfClubs = allGolfClubs.total;
    const totalHoles = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalHoles, 0);
    const totalCourses = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalCourses, 0);

    return NatsResponse.success({
      averageHoles: totalGolfClubs > 0 ? Math.round(totalHoles / totalGolfClubs) : 0,
      averageCourses: totalGolfClubs > 0 ? Math.round(totalCourses / totalGolfClubs) : 0,
      totalGolfClubs,
    });
  }
}
