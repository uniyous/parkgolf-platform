import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService } from '../service/company.service';

@Controller()
export class CompanyNatsController {
  private readonly logger = new Logger(CompanyNatsController.name);

  constructor(
    private readonly companyService: CompanyService,
  ) {}

  // Company NATS Message Handlers
  @MessagePattern('companies.list')
  async getCompanies(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting companies list`);
      
      const { page = 1, limit = 20 } = data;
      const companies = await this.companyService.findAll();
      
      // Apply pagination manually
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedCompanies = companies.slice(startIndex, endIndex);
      
      const result = {
        companies: paginatedCompanies.map((company: any) => ({
          id: company.id,
          name: company.name,
          description: company.description,
          address: company.address,
          phoneNumber: company.phoneNumber,
          email: company.email,
          website: company.website,
          isActive: company.isActive,
          createdAt: company.createdAt.toISOString(),
          updatedAt: company.updatedAt.toISOString()
        })),
        totalCount: companies.length,
        totalPages: Math.ceil(companies.length / Number(limit)),
        page: Number(page)
      };

      this.logger.log(`NATS: Returning ${result.companies.length} companies`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get companies', error);
      throw error;
    }
  }

  @MessagePattern('companies.findById')
  async getCompanyById(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Getting company ${data.companyId}`);
      
      const company = await this.companyService.findOne(Number(data.companyId));
      
      const result = {
        id: company.id,
        name: company.name,
        description: company.description,
        address: company.address,
        phoneNumber: company.phoneNumber,
        email: company.email,
        website: company.website,
        isActive: company.isActive,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Returning company ${company.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to get company', error);
      throw error;
    }
  }

  @MessagePattern('companies.create')
  async createCompany(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Creating company`);
      
      const company = await this.companyService.create(data.data);
      
      const result = {
        id: company.id,
        name: company.name,
        description: company.description,
        address: company.address,
        phoneNumber: company.phoneNumber,
        email: company.email,
        website: company.website,
        isActive: company.isActive,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Created company with ID ${company.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to create company', error);
      throw error;
    }
  }

  @MessagePattern('companies.update')
  async updateCompany(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Updating company ${data.companyId}`);
      
      const company = await this.companyService.update(Number(data.companyId), data.data);
      
      const result = {
        id: company.id,
        name: company.name,
        description: company.description,
        address: company.address,
        phoneNumber: company.phoneNumber,
        email: company.email,
        website: company.website,
        isActive: company.isActive,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString()
      };

      this.logger.log(`NATS: Updated company ${company.id}`);
      return result;
    } catch (error) {
      this.logger.error('NATS: Failed to update company', error);
      throw error;
    }
  }

  @MessagePattern('companies.delete')
  async deleteCompany(@Payload() data: any) {
    try {
      this.logger.log(`NATS: Deleting company ${data.companyId}`);
      
      await this.companyService.remove(Number(data.companyId));
      
      this.logger.log(`NATS: Deleted company ${data.companyId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('NATS: Failed to delete company', error);
      throw error;
    }
  }
}