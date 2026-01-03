import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService } from '../service/company.service';
import { CreateCompanyDto, CompanyResponseDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyPayload, NatsResponse } from '../../common/types/response.types';

@Controller()
export class CompanyNatsController {
  private readonly logger = new Logger(CompanyNatsController.name);

  constructor(private readonly companyService: CompanyService) {}

  @MessagePattern('companies.list')
  async getCompanies(@Payload() data: CompanyPayload) {
    this.logger.log('NATS: Getting companies list');

    const { page = 1, limit = 20 } = data;
    const result = await this.companyService.findAll(Number(page), Number(limit));
    const companies = result.companies.map(CompanyResponseDto.fromEntity);

    return NatsResponse.paginated({ companies }, result.total, result.page, result.limit);
  }

  @MessagePattern('companies.findById')
  async getCompanyById(@Payload() data: CompanyPayload) {
    this.logger.log(`NATS: Getting company ${data.companyId}`);
    const company = await this.companyService.findOne(Number(data.companyId));
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('companies.create')
  async createCompany(@Payload() data: CompanyPayload) {
    this.logger.log('NATS: Creating company');
    const company = await this.companyService.create(data.data as CreateCompanyDto);
    this.logger.log(`NATS: Created company with ID ${company.id}`);
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('companies.update')
  async updateCompany(@Payload() data: CompanyPayload) {
    this.logger.log(`NATS: Updating company ${data.companyId}`);
    const company = await this.companyService.update(Number(data.companyId), data.data as UpdateCompanyDto);
    this.logger.log(`NATS: Updated company ${company.id}`);
    return NatsResponse.success(CompanyResponseDto.fromEntity(company));
  }

  @MessagePattern('companies.delete')
  async deleteCompany(@Payload() data: CompanyPayload) {
    this.logger.log(`NATS: Deleting company ${data.companyId}`);
    await this.companyService.remove(Number(data.companyId));
    this.logger.log(`NATS: Deleted company ${data.companyId}`);
    return NatsResponse.deleted();
  }
}
