import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PartnerConfigService } from '../service/partner-config.service';
import { PartnerClientService } from '../../client/partner-client.service';
import { CreatePartnerConfigDto } from '../dto/create-partner-config.dto';
import { UpdatePartnerConfigDto } from '../dto/update-partner-config.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class PartnerConfigNatsController {
  constructor(
    private readonly partnerConfigService: PartnerConfigService,
    private readonly partnerClientService: PartnerClientService,
  ) {}

  @MessagePattern('partner.config.create')
  async create(@Payload() data: CreatePartnerConfigDto) {
    const result = await this.partnerConfigService.create(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.config.get')
  async findById(@Payload() data: { id: number }) {
    const result = await this.partnerConfigService.findById(data.id);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.config.getByClub')
  async findByClubId(@Payload() data: { clubId: number }) {
    const result = await this.partnerConfigService.findByClubId(data.clubId);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.config.list')
  async findAll(@Payload() data: { page?: number; limit?: number; companyId?: number; isActive?: boolean }) {
    const { data: items, total, page, limit } = await this.partnerConfigService.findAll(data);
    return NatsResponse.paginated(items, total, page, limit);
  }

  @MessagePattern('partner.config.update')
  async update(@Payload() data: UpdatePartnerConfigDto) {
    const result = await this.partnerConfigService.update(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('partner.config.delete')
  async delete(@Payload() data: { id: number }) {
    await this.partnerConfigService.delete(data.id);
    return NatsResponse.deleted();
  }

  /**
   * 골프장의 파트너 연동 여부 확인 (Saga에서 사용)
   * 설정이 없어도 에러를 던지지 않고 isPartnerClub: false 반환
   */
  @MessagePattern('partner.config.checkByClub')
  async checkByClubId(@Payload() data: { clubId: number }) {
    const isPartnerClub = await this.partnerConfigService.isPartnerClub(data.clubId);
    return NatsResponse.success({ isPartnerClub });
  }

  @MessagePattern('partner.config.test')
  async testConnection(@Payload() data: { id: number }) {
    const result = await this.partnerClientService.testConnection(data.id);
    return NatsResponse.success(result);
  }
}
