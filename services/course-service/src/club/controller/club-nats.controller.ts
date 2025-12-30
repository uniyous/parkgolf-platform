import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClubService } from '../service/club.service';
import { ClubFilterDto, CreateClubDto, UpdateClubDto, ClubResponseDto } from '../dto/club.dto';
import {
  successResponse,
  errorResponse,
  paginationMeta,
} from '../../common/utils/response.util';
import { ClubPayload } from '../../common/types/response.types';

@Controller()
export class ClubNatsController {
  private readonly logger = new Logger(ClubNatsController.name);

  constructor(private readonly clubService: ClubService) {}

  @MessagePattern('club.create')
  async createGolfClub(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Creating club with data: ${JSON.stringify(data)}`);
      const { token, ...createGolfClubDto } = data;
      const club = await this.clubService.create((createGolfClubDto.data || createGolfClubDto) as CreateClubDto);
      return successResponse(ClubResponseDto.fromEntity(club));
    } catch (error) {
      this.logger.error('Failed to create club', error);
      return errorResponse('CLUB_CREATE_FAILED', error.message || 'Failed to create club');
    }
  }

  @MessagePattern('club.findAll')
  async findAllGolfClubs(@Payload() data: ClubPayload & ClubFilterDto) {
    try {
      this.logger.log(`Finding clubs with data: ${JSON.stringify(data)}`);
      const { token, ...filters } = data;
      const result = await this.clubService.findAll(filters);
      const clubs = result.data.map(ClubResponseDto.fromEntity);
      return successResponse({ clubs }, paginationMeta(result.total, result.page, result.limit));
    } catch (error) {
      this.logger.error('Failed to find clubs', error);
      return errorResponse('CLUBS_LIST_FAILED', error.message || 'Failed to find clubs');
    }
  }

  @MessagePattern('club.findOne')
  async findOneGolfClub(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Finding club with data: ${JSON.stringify(data)}`);
      const { token, ...params } = data;
      const club = await this.clubService.findOne(params.id);
      return successResponse(ClubResponseDto.fromEntity(club));
    } catch (error) {
      this.logger.error('Failed to find club', error);
      return errorResponse('CLUB_NOT_FOUND', error.message || 'Club not found');
    }
  }

  @MessagePattern('club.update')
  async updateGolfClub(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Updating club with data: ${JSON.stringify(data)}`);
      const { token, ...params } = data;
      const club = await this.clubService.update(params.id!, params.updateClubDto as UpdateClubDto);
      return successResponse(ClubResponseDto.fromEntity(club));
    } catch (error) {
      this.logger.error('Failed to update club', error);
      return errorResponse('CLUB_UPDATE_FAILED', error.message || 'Failed to update club');
    }
  }

  @MessagePattern('club.remove')
  async removeGolfClub(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Removing club with data: ${JSON.stringify(data)}`);
      const { token, ...params } = data;
      await this.clubService.remove(params.id);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('Failed to remove club', error);
      return errorResponse('CLUB_DELETE_FAILED', error.message || 'Failed to remove club');
    }
  }

  @MessagePattern('club.findByCompany')
  async findGolfClubsByCompany(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Finding clubs by company with data: ${JSON.stringify(data)}`);
      const { token, ...params } = data;
      const clubs = await this.clubService.findByCompany(params.companyId);
      return successResponse(clubs.map(ClubResponseDto.fromEntity));
    } catch (error) {
      this.logger.error('Failed to find clubs by company', error);
      return errorResponse('CLUBS_BY_COMPANY_FAILED', error.message || 'Failed to find clubs by company');
    }
  }

  @MessagePattern('club.updateStats')
  async updateGolfClubStats(@Payload() data: { clubId: number }) {
    try {
      this.logger.log(`Updating stats for club ID: ${data.clubId}`);
      await this.clubService.updateStats(data.clubId);
      return successResponse({ updated: true });
    } catch (error) {
      this.logger.error('Failed to update club stats', error);
      return errorResponse('CLUB_STATS_UPDATE_FAILED', error.message || 'Failed to update club stats');
    }
  }

  @MessagePattern('club.search')
  async searchGolfClubs(@Payload() data: ClubPayload) {
    try {
      this.logger.log(`Searching clubs with data: ${JSON.stringify(data)}`);
      const { token, ...params } = data;

      const filters: ClubFilterDto = {
        search: params.query,
        limit: params.limit || 10,
        page: 1,
      };

      const result = await this.clubService.findAll(filters);
      return successResponse(result.data.map(ClubResponseDto.fromEntity));
    } catch (error) {
      this.logger.error('Failed to search clubs', error);
      return errorResponse('CLUBS_SEARCH_FAILED', error.message || 'Failed to search clubs');
    }
  }

  @MessagePattern('club.findPopular')
  async findPopularGolfClubs(@Payload() data: { limit?: number }) {
    try {
      this.logger.log(`Finding popular clubs (limit: ${data.limit || 10})`);

      const filters: ClubFilterDto = {
        sortBy: 'totalCourses',
        sortOrder: 'desc',
        limit: data.limit || 10,
        page: 1,
      };

      const result = await this.clubService.findAll(filters);
      return successResponse(result.data.map(ClubResponseDto.fromEntity));
    } catch (error) {
      this.logger.error('Failed to find popular clubs', error);
      return errorResponse('CLUBS_POPULAR_FAILED', error.message || 'Failed to find popular clubs');
    }
  }

  @MessagePattern('club.getStatusCounts')
  async getGolfClubStatusCounts() {
    try {
      this.logger.log('Getting club status counts');
      const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });

      const statusCounts = allGolfClubs.data.reduce((acc, club) => {
        acc[club.status] = (acc[club.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      return successResponse(statusCounts);
    } catch (error) {
      this.logger.error('Failed to get club status counts', error);
      return errorResponse('CLUBS_STATUS_COUNTS_FAILED', error.message || 'Failed to get status counts');
    }
  }

  @MessagePattern('club.getAverageStats')
  async getGolfClubAverageStats() {
    try {
      this.logger.log('Getting club average statistics');
      const allGolfClubs = await this.clubService.findAll({ limit: 1000, page: 1 });

      const totalGolfClubs = allGolfClubs.total;
      const totalHoles = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalHoles, 0);
      const totalCourses = allGolfClubs.data.reduce((sum, gc) => sum + gc.totalCourses, 0);

      return successResponse({
        averageHoles: totalGolfClubs > 0 ? Math.round(totalHoles / totalGolfClubs) : 0,
        averageCourses: totalGolfClubs > 0 ? Math.round(totalCourses / totalGolfClubs) : 0,
        totalGolfClubs,
      });
    } catch (error) {
      this.logger.error('Failed to get club average stats', error);
      return errorResponse('CLUBS_AVERAGE_STATS_FAILED', error.message || 'Failed to get average stats');
    }
  }
}
