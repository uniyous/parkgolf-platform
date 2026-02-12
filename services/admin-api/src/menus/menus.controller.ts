import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { BearerToken } from '../common';

/**
 * Menus Controller (BFF for iam-service)
 *
 * REST Endpoints -> NATS Patterns:
 * - GET /menus -> iam.menu.getByAdmin
 */
@ApiTags('menus')
@ApiBearerAuth()
@Controller('api/admin/menus')
export class MenusController {
  private readonly logger = new Logger(MenusController.name);

  constructor(private readonly menusService: MenusService) {}

  @Get()
  @ApiOperation({ summary: 'Get menu tree by admin permissions' })
  @ApiQuery({ name: 'permissions', required: true, description: 'Comma-separated permission codes' })
  @ApiQuery({ name: 'companyType', required: true, description: 'Company type (PLATFORM, ASSOCIATION, FRANCHISE)' })
  @ApiQuery({ name: 'scope', required: false, description: 'Admin scope (PLATFORM, COMPANY)' })
  @ApiResponse({ status: 200, description: 'Menu tree retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMenus(
    @BearerToken() token: string,
    @Query('permissions') permissions: string,
    @Query('companyType') companyType: string,
    @Query('scope') scope?: string,
  ) {
    const permissionList = permissions ? permissions.split(',').map((p) => p.trim()) : [];
    this.logger.log(`Fetching menus - companyType: ${companyType}, scope: ${scope}`);
    return this.menusService.getMenusByAdmin(permissionList, companyType, scope || '', token);
  }
}
