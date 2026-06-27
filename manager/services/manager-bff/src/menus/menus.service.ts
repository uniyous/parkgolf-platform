import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';

/**
 * Menus Service for Admin API
 *
 * NATS Patterns (iam-service):
 * - iam.menu.getByAdmin: 관리자 권한 기반 메뉴 트리 조회
 */
@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async getMenusByAdmin(
    permissions: string[],
    companyType: string,
    scope: string,
  ): Promise<any> {
    this.logger.log(`Fetching menus for companyType=${companyType}, scope=${scope}`);
    return this.natsClient.send(
      'iam.menu.getByAdmin',
      { permissions, companyType, scope },
      NATS_TIMEOUTS.QUICK,
    );
  }
}
