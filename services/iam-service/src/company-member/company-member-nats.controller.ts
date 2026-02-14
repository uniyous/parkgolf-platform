import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyMemberService } from './company-member.service';
import { NatsResponse } from '../common/types/response.types';
import {
  CreateCompanyMemberDto,
  FindCompanyMembersQueryDto,
  UpdateCompanyMemberDto,
} from './dto/company-member.dto';

@Controller()
export class CompanyMemberNatsController {
  private readonly logger = new Logger(CompanyMemberNatsController.name);

  constructor(private readonly companyMemberService: CompanyMemberService) {}

  @MessagePattern('iam.companyMembers.list')
  async list(@Payload() query: FindCompanyMembersQueryDto) {
    this.logger.log(`List company members: companyId=${query.companyId}`);
    const result = await this.companyMemberService.findByCompany(query);
    return NatsResponse.paginated(result.data, result.total, result.page, result.limit);
  }

  @MessagePattern('iam.companyMembers.create')
  async create(@Payload() dto: CreateCompanyMemberDto) {
    this.logger.log(`Create company member: companyId=${dto.companyId}, userId=${dto.userId}`);
    const member = await this.companyMemberService.create(dto);
    return NatsResponse.success(member);
  }

  @MessagePattern('iam.companyMembers.update')
  async update(@Payload() data: { id: number; dto: UpdateCompanyMemberDto }) {
    this.logger.log(`Update company member: id=${data.id}`);
    const member = await this.companyMemberService.update(data.id, data.dto);
    return NatsResponse.success(member);
  }

  @MessagePattern('iam.companyMembers.delete')
  async remove(@Payload() data: { id: number }) {
    this.logger.log(`Delete company member: id=${data.id}`);
    await this.companyMemberService.remove(data.id);
    return NatsResponse.deleted();
  }

  @MessagePattern('iam.companyMembers.addByBooking')
  async addByBooking(@Payload() data: { companyId: number; userId: number }) {
    this.logger.log(`Add by booking: companyId=${data.companyId}, userId=${data.userId}`);
    const member = await this.companyMemberService.addByBooking(data.companyId, data.userId);
    return NatsResponse.success(member);
  }
}
