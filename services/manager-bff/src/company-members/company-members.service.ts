import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

@Injectable()
export class CompanyMembersService {
  private readonly logger = new Logger(CompanyMembersService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async list(query: any): Promise<any> {
    this.logger.log(`List company members: companyId=${query.companyId}`);
    return this.natsClient.send('iam.companyMembers.list', query, NATS_TIMEOUTS.LIST_QUERY);
  }

  async create(data: any): Promise<any> {
    this.logger.log('Create company member');
    return this.natsClient.send('iam.companyMembers.create', data);
  }

  async update(id: number, dto: any): Promise<any> {
    this.logger.log(`Update company member: ${id}`);
    return this.natsClient.send('iam.companyMembers.update', { id, dto });
  }

  async remove(id: number): Promise<any> {
    this.logger.log(`Delete company member: ${id}`);
    return this.natsClient.send('iam.companyMembers.delete', { id });
  }
}
