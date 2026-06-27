import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GameMappingService } from '../service/game-mapping.service';
import { CreateGameMappingDto } from '../dto/create-game-mapping.dto';
import { UpdateGameMappingDto } from '../dto/update-game-mapping.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class GameMappingNatsController {
  constructor(private readonly gameMappingService: GameMappingService) {}

  @MessagePattern('partner.gameMapping.create')
  async create(@Payload() data: CreateGameMappingDto) {
    const result = await this.gameMappingService.create(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.gameMapping.list')
  async findByPartnerId(@Payload() data: { partnerId: number }) {
    const result = await this.gameMappingService.findByPartnerId(data.partnerId);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.gameMapping.update')
  async update(@Payload() data: UpdateGameMappingDto) {
    const result = await this.gameMappingService.update(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.gameMapping.delete')
  async delete(@Payload() data: { id: number }) {
    await this.gameMappingService.delete(data.id);
    return NatsResponse.deleted();
  }
}
