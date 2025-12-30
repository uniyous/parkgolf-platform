import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService } from '../service/company.service';
import { CreateCompanyDto, CompanyResponseDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import {
  successResponse,
  errorResponse,
  paginationMeta,
} from '../../common/utils/response.util';
import { CompanyPayload } from '../../common/types/response.types';

@Controller()
export class CompanyNatsController {
  private readonly logger = new Logger(CompanyNatsController.name);

  constructor(private readonly companyService: CompanyService) {}

  @MessagePattern('companies.list')
  async getCompanies(@Payload() data: CompanyPayload) {
    try {
      this.logger.log('NATS: Getting companies list');

      const { page = 1, limit = 20 } = data;
      const result = await this.companyService.findAll(Number(page), Number(limit));

      return successResponse(
        { companies: result.companies.map(CompanyResponseDto.fromEntity) },
        paginationMeta(result.total, result.page, result.limit)
      );
    } catch (error) {
      this.logger.error('NATS: Failed to get companies', error);
      return errorResponse('COMPANIES_LIST_FAILED', error.message || 'Failed to get companies');
    }
  }

  @MessagePattern('companies.findById')
  async getCompanyById(@Payload() data: CompanyPayload) {
    try {
      this.logger.log(`NATS: Getting company ${data.companyId}`);
      const company = await this.companyService.findOne(Number(data.companyId));
      return successResponse(CompanyResponseDto.fromEntity(company));
    } catch (error) {
      this.logger.error('NATS: Failed to get company', error);
      return errorResponse('COMPANY_NOT_FOUND', error.message || 'Company not found');
    }
  }

  @MessagePattern('companies.create')
  async createCompany(@Payload() data: CompanyPayload) {
    try {
      this.logger.log('NATS: Creating company');
      const company = await this.companyService.create(data.data as CreateCompanyDto);
      this.logger.log(`NATS: Created company with ID ${company.id}`);
      return successResponse(CompanyResponseDto.fromEntity(company));
    } catch (error) {
      this.logger.error('NATS: Failed to create company', error);
      return errorResponse('COMPANY_CREATE_FAILED', error.message || 'Failed to create company');
    }
  }

  @MessagePattern('companies.update')
  async updateCompany(@Payload() data: CompanyPayload) {
    try {
      this.logger.log(`NATS: Updating company ${data.companyId}`);
      const company = await this.companyService.update(Number(data.companyId), data.data as UpdateCompanyDto);
      this.logger.log(`NATS: Updated company ${company.id}`);
      return successResponse(CompanyResponseDto.fromEntity(company));
    } catch (error) {
      this.logger.error('NATS: Failed to update company', error);
      return errorResponse('COMPANY_UPDATE_FAILED', error.message || 'Failed to update company');
    }
  }

  @MessagePattern('companies.delete')
  async deleteCompany(@Payload() data: CompanyPayload) {
    try {
      this.logger.log(`NATS: Deleting company ${data.companyId}`);
      await this.companyService.remove(Number(data.companyId));
      this.logger.log(`NATS: Deleted company ${data.companyId}`);
      return successResponse({ deleted: true });
    } catch (error) {
      this.logger.error('NATS: Failed to delete company', error);
      return errorResponse('COMPANY_DELETE_FAILED', error.message || 'Failed to delete company');
    }
  }
}
