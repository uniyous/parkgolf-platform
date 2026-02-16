import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClubService } from '../service/club.service';
import { ClubFilterDto, CreateClubDto, UpdateClubDto, ClubResponseDto, FindNearbyDto } from '../dto/club.dto';
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
    return NatsResponse.paginated(clubs, result.total, result.page, result.limit);
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

  @MessagePattern('club.findNearby')
  async findNearbyGolfClubs(@Payload() data: FindNearbyDto) {
    this.logger.log(`Finding nearby clubs: lat=${data.latitude}, lon=${data.longitude}, radius=${data.radiusKm || 30}km`);
    const clubs = await this.clubService.findNearby(data);
    return NatsResponse.success(clubs);
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

}
