import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getCompanies(page = 1, limit = 20, adminToken: string): Promise<any> {
    this.logger.log('Fetching companies');
    return this.natsClient.send('iam.companies.list', { page, limit, token: adminToken }, NATS_TIMEOUTS.LIST_QUERY);
  }

  async getCompanyById(companyId: string, adminToken: string): Promise<any> {
    this.logger.log(`Fetching company: ${companyId}`);
    return this.natsClient.send('iam.companies.getById', { companyId, token: adminToken }, NATS_TIMEOUTS.QUICK);
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
}
