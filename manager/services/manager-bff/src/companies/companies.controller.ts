import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { BearerToken } from '../common';

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
@ApiBearerAuth()
@Controller('api/admin/companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Get companies list' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanies(
    @BearerToken({ required: false }) token: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filters = { status, search };
    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || '20', 10) || 20;
    this.logger.log(`Fetching companies - page: ${pageNum}, limit: ${limitNum}`);
    return this.companiesService.getCompanies(pageNum, limitNum, token || '', filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ status: 200, description: 'Company stats retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyStats(@BearerToken({ required: false }) token: string | undefined) {
    this.logger.log('Fetching company stats');
    return this.companiesService.getCompanyStats(token || '');
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get company by code' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyByCode(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('code') code: string,
  ) {
    this.logger.log(`Fetching company by code: ${code}`);
    return this.companiesService.getCompanyByCode(code, token || '');
  }

  @Get(':companyId')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyById(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('companyId') companyId: string,
  ) {
    this.logger.log(`Fetching company: ${companyId}`);
    return this.companiesService.getCompanyById(companyId, token || '');
  }

  @Get(':companyId/admins')
  @ApiOperation({ summary: 'Get admins for a company' })
  @ApiResponse({ status: 200, description: 'Company admins retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompanyAdmins(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('companyId') companyId: string,
  ) {
    this.logger.log(`Fetching admins for company: ${companyId}`);
    return this.companiesService.getCompanyAdmins(companyId, token || '');
  }

  @Post()
  @ApiOperation({ summary: 'Create new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCompany(
    @BearerToken({ required: false }) token: string | undefined,
    @Body() companyData: Record<string, unknown>,
  ) {
    this.logger.log('Creating company');
    return this.companiesService.createCompany(companyData, token || '');
  }

  @Patch(':companyId')
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCompany(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('companyId') companyId: string,
    @Body() updateData: Record<string, unknown>,
  ) {
    this.logger.log(`Updating company: ${companyId}`);
    return this.companiesService.updateCompany(companyId, updateData, token || '');
  }

  @Patch(':companyId/status')
  @ApiOperation({ summary: 'Update company status' })
  @ApiResponse({ status: 200, description: 'Company status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCompanyStatus(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('companyId') companyId: string,
    @Body() body: { status: string },
  ) {
    this.logger.log(`Updating company status: ${companyId} -> ${body.status}`);
    return this.companiesService.updateCompanyStatus(companyId, body.status, token || '');
  }

  @Delete(':companyId')
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteCompany(
    @BearerToken({ required: false }) token: string | undefined,
    @Param('companyId') companyId: string,
  ) {
    this.logger.log(`Deleting company: ${companyId}`);
    return this.companiesService.deleteCompany(companyId, token || '');
  }
}
