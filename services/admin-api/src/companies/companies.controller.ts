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

/**
 * Companies Controller (BFF for iam-service)
 *
 * REST Endpoints -> NATS Patterns:
 * - GET /companies -> iam.companies.list
 * - GET /companies/stats -> iam.companies.stats
 * - GET /companies/code/:code -> iam.companies.getByCode
 * - GET /companies/:id -> iam.companies.getById
 * - GET /companies/:id/admins -> iam.companies.admins
 * - POST /companies -> iam.companies.create
 * - PATCH /companies/:id -> iam.companies.update
 * - PATCH /companies/:id/status -> iam.companies.updateStatus
 * - DELETE /companies/:id -> iam.companies.delete
 */
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
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async getCompanies(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    const filters = { status, search };
    // 쿼리 파라미터는 항상 문자열이므로 명시적으로 숫자로 변환
    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || '20', 10) || 20;
    this.logger.log(`Fetching companies - page: ${pageNum}, limit: ${limitNum}`);
    return this.companiesService.getCompanies(pageNum, limitNum, token, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company stats retrieved successfully' })
  async getCompanyStats(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log('Fetching company stats');
    return this.companiesService.getCompanyStats(token);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get company by code' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  async getCompanyByCode(
    @Param('code') code: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching company by code: ${code}`);
    return this.companiesService.getCompanyByCode(code, token);
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  async getCompanyById(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching company: ${companyId}`);
    return this.companiesService.getCompanyById(companyId, token);
  }

  @Get(':companyId/admins')
  @ApiOperation({ summary: 'Get admins for a company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company admins retrieved successfully' })
  async getCompanyAdmins(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Fetching admins for company: ${companyId}`);
    return this.companiesService.getCompanyAdmins(companyId, token);
  }

  @Post()
  @ApiOperation({ summary: 'Create new company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async createCompany(
    @Body() companyData: any,
    @Headers('authorization') authorization?: string,
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
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Updating company: ${companyId}`);
    return this.companiesService.updateCompany(companyId, updateData, token);
  }

  @Patch(':companyId/status')
  @ApiOperation({ summary: 'Update company status' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company status updated successfully' })
  async updateCompanyStatus(
    @Param('companyId') companyId: string,
    @Body() body: { status: string },
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Updating company status: ${companyId} -> ${body.status}`);
    return this.companiesService.updateCompanyStatus(companyId, body.status, token);
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Delete company' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  async deleteCompany(
    @Param('companyId') companyId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const token = authorization?.replace('Bearer ', '') || '';
    this.logger.log(`Deleting company: ${companyId}`);
    return this.companiesService.deleteCompany(companyId, token);
  }
}
