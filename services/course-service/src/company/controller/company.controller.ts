import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService } from '../service/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // NATS Message Handlers
  @MessagePattern('companies.list')
  async getCompaniesViaMessage(@Payload() data: { page?: number; limit?: number; token?: string }) {
    try {
      const { page = 1, limit = 20 } = data;
      const companies = await this.companyService.findAll();
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCompanies = companies.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: paginatedCompanies,
        pagination: {
          page,
          limit,
          total: companies.length,
          totalPages: Math.ceil(companies.length / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANIES_FETCH_FAILED',
          message: error.message || 'Failed to fetch companies'
        }
      };
    }
  }

  @MessagePattern('companies.findById')
  async getCompanyByIdViaMessage(@Payload() data: { companyId: string; token?: string }) {
    try {
      const company = await this.companyService.findOne(parseInt(data.companyId));
      return {
        success: true,
        data: company
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: error.message || 'Company not found'
        }
      };
    }
  }

  @MessagePattern('companies.create')
  async createCompanyViaMessage(@Payload() data: { data: CreateCompanyDto; token: string }) {
    try {
      const company = await this.companyService.create(data.data);
      return {
        success: true,
        data: company
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANY_CREATE_FAILED',
          message: error.message || 'Failed to create company'
        }
      };
    }
  }

  @MessagePattern('companies.update')
  async updateCompanyViaMessage(@Payload() data: { companyId: string; data: UpdateCompanyDto; token: string }) {
    try {
      const company = await this.companyService.update(parseInt(data.companyId), data.data);
      return {
        success: true,
        data: company
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANY_UPDATE_FAILED',
          message: error.message || 'Failed to update company'
        }
      };
    }
  }

  @MessagePattern('companies.delete')
  async deleteCompanyViaMessage(@Payload() data: { companyId: string; token: string }) {
    try {
      const result = await this.companyService.remove(parseInt(data.companyId));
      return {
        success: true,
        data: result,
        message: `Company with ID ${data.companyId} successfully deleted.`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANY_DELETE_FAILED',
          message: error.message || 'Failed to delete company'
        }
      };
    }
  }

  // HTTP Endpoints (existing)
  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.companyService.remove(id);
    return {
      message: `Company with ID ${id} successfully deleted.`,
      result,
    };
  }
}
