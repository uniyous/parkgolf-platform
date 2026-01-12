import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

/**
 * Companies Service for Admin API
 *
 * NATS Patterns (iam-service):
 * - iam.companies.list, iam.companies.getById, iam.companies.getByCode
 * - iam.companies.create, iam.companies.update, iam.companies.delete
 * - iam.companies.updateStatus, iam.companies.admins, iam.companies.stats
 */
@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getCompanies(
    page = 1,
    limit = 20,
    adminToken: string,
    filters?: { status?: string; isActive?: boolean; search?: string }
  ): Promise<any> {
    this.logger.log('Fetching companies');

    // undefined 값 제거한 필터 객체 생성
    const cleanFilters: Record<string, any> = {};
    if (filters?.status) cleanFilters.status = filters.status;
    if (filters?.isActive !== undefined) cleanFilters.isActive = filters.isActive;
    if (filters?.search) cleanFilters.search = filters.search;

    return this.natsClient.send(
      'iam.companies.list',
      {
        filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
        page,
        limit,
        token: adminToken,
      },
      NATS_TIMEOUTS.LIST_QUERY
    );
  }

  async getCompanyById(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching company: ${companyId}`);
    return this.natsClient.send('iam.companies.getById', { companyId, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async getCompanyByCode(code: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching company by code: ${code}`);
    return this.natsClient.send('iam.companies.getByCode', { code, token: adminToken }, NATS_TIMEOUTS.QUICK);
  }

  async createCompany(companyData: any, adminToken: string): Promise<any> {
    this.logger.log('Creating company');
    return this.natsClient.send('iam.companies.create', { companyData, token: adminToken });
  }

  async updateCompany(companyId: string, updateData: any, adminToken: string): Promise<any> {
    this.logger.log(`Updating company: ${companyId}`);
    return this.natsClient.send('iam.companies.update', { companyId, updateData, token: adminToken });
  }

  async deleteCompany(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Deleting company: ${companyId}`);
    return this.natsClient.send('iam.companies.delete', { companyId, token: adminToken });
  }

  async updateCompanyStatus(companyId: string, status: string, adminToken: string): Promise<any> {
    this.logger.log(`Updating company status: ${companyId} -> ${status}`);
    return this.natsClient.send('iam.companies.updateStatus', { companyId, status, token: adminToken });
  }

  async getCompanyAdmins(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching admins for company: ${companyId}`);
    return this.natsClient.send('iam.companies.admins', { companyId, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCompanyStats(adminToken: string): Promise<any> {
    this.logger.log('Fetching company stats');
    return this.natsClient.send('iam.companies.stats', { token: adminToken }, NATS_TIMEOUTS.ANALYTICS);
  }
}
