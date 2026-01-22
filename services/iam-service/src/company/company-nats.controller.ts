import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService } from './company.service';
import { CompanyResponseDto } from './dto/create-company.dto';
import { NatsResponse } from '../common/types/response.types';
import { CompanyStatus } from '@prisma/client';

/**
 * Company Management NATS Controller
 *
 * Handles company CRUD operations:
 * - iam.companies.list, iam.companies.getById, iam.companies.getByCode
 * - iam.companies.create, iam.companies.update, iam.companies.delete
 * - iam.companies.updateStatus, iam.companies.admins, iam.companies.stats
 */
@Controller()
export class CompanyNatsController {
  private readonly logger = new Logger(CompanyNatsController.name);

  constructor(private readonly companyService: CompanyService) {}

  @MessagePattern('iam.companies.list')
  async getCompanyList(
    @Payload()
    data: {
      filters?: {
        status?: CompanyStatus;
        isActive?: boolean;
        search?: string;
      };
      page?: number;
      limit?: number;
      token?: string;
    }
  ) {
    this.logger.log('Get company list request');
    const { filters, page = 1, limit = 20 } = data || {};

    // filters가 undefined일 경우 빈 객체로 처리
    const safeFilters = filters || {};

    const result = await this.companyService.findAll({
      ...safeFilters,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    return NatsResponse.paginated(
      CompanyResponseDto.fromEntities(result.companies),
      result.total,
      result.page,
      result.limit
    );
  }

  @MessagePattern('iam.companies.getById')
  async getCompanyById(@Payload() data: { companyId: string; token?: string }) {
    this.logger.log(`Get company by ID: ${data.companyId}`);
    const company = await this.companyService.findOne(parseInt(data.companyId, 10));
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('iam.companies.getByCode')
  async getCompanyByCode(@Payload() data: { code: string; token?: string }) {
    this.logger.log(`Get company by code: ${data.code}`);
    const company = await this.companyService.findByCode(data.code);
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('iam.companies.create')
  async createCompany(@Payload() data: { companyData: any; token?: string }) {
    this.logger.log(`Create company: ${data.companyData?.name}`);
    const company = await this.companyService.create(data.companyData);
    this.logger.log(`Company created: ${company.code}`);
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('iam.companies.update')
  async updateCompany(@Payload() data: { companyId: string; updateData: any; token?: string }) {
    this.logger.log(`Update company: ${data.companyId}`);
    const company = await this.companyService.update(
      parseInt(data.companyId, 10),
      data.updateData
    );
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('iam.companies.delete')
  async deleteCompany(@Payload() data: { companyId: string; token?: string }) {
    this.logger.log(`Delete company: ${data.companyId}`);
    await this.companyService.remove(parseInt(data.companyId, 10));
    return NatsResponse.deleted();
  }

  @MessagePattern('iam.companies.updateStatus')
  async updateCompanyStatus(
    @Payload() data: { companyId: string; status: CompanyStatus; token?: string }
  ) {
    this.logger.log(`Update company status: ${data.companyId} -> ${data.status}`);
    const company = await this.companyService.updateStatus(
      parseInt(data.companyId, 10),
      data.status
    );
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('iam.companies.admins')
  async getCompanyAdmins(@Payload() data: { companyId: string; token?: string }) {
    this.logger.log(`Get admins for company: ${data.companyId}`);
    const admins = await this.companyService.getAdmins(parseInt(data.companyId, 10));
    return NatsResponse.success(admins);
  }

  @MessagePattern('iam.companies.stats')
  async getCompanyStats(@Payload() data: { token?: string }) {
    this.logger.log('Get company stats request');
    const stats = await this.companyService.getStats();
    return NatsResponse.success(stats);
  }
}
