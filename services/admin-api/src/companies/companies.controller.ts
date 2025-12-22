import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('api/admin/companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Get companies list' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async getCompanies(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching companies - page: ${page}, limit: ${limit}`);
    return this.companiesService.getCompanies(page, limit, token);
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  async getCompanyById(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching company: ${companyId}`);
    return this.companiesService.getCompanyById(companyId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async createCompany(
    @Body() companyData: any,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log('Creating company');
    return this.companiesService.createCompany(companyData, token);
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Update company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  async updateCompany(
    @Param('companyId') companyId: string,
    @Body() updateData: any,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Updating company: ${companyId}`);
    return this.companiesService.updateCompany(companyId, updateData, token);
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Delete company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Deleting company: ${companyId}`);
    return this.companiesService.deleteCompany(companyId, token);
  }
}
