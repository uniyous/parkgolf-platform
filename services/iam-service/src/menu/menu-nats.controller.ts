import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MenuService } from './menu.service';
import { NatsResponse } from '../common/types/response.types';
import { GetMenuByAdminDto } from './dto/get-menu.dto';

/**
 * Menu NATS Controller
 *
 * NATS Patterns:
 * - iam.menu.getByAdmin: 관리자 권한/회사유형 기반 메뉴 트리 조회
 */
@Controller()
export class MenuNatsController {
  private readonly logger = new Logger(MenuNatsController.name);

  constructor(private readonly menuService: MenuService) {}

  @MessagePattern('iam.menu.getByAdmin')
  async getMenusByAdmin(@Payload() data: GetMenuByAdminDto) {
    this.logger.log(`Get menus for companyType=${data.companyType}`);
    const menus = await this.menuService.getMenusByAdmin(
      data.permissions,
      data.companyType,
      data.scope,
    );
    return NatsResponse.success(menus);
  }
}
