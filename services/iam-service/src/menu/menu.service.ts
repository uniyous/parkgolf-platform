import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyType } from '@prisma/client';

export interface MenuTreeItem {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  children: MenuChildItem[];
}

export interface MenuChildItem {
  id: number;
  code: string;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isWritable: boolean;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 관리자의 권한과 회사유형에 따라 접근 가능한 메뉴 트리를 반환
   *
   * 필터링 로직 (ADMIN_SITE_PLAN.md 5.3):
   * 1. admin.companyType ∈ menu.menuCompanyTypes
   * 2. admin.permissions ∩ menu.menuPermissions ≠ ∅  OR  'ALL' ∈ permissions
   * 3. menu.platformOnly=true → admin.scope='PLATFORM'만
   * 4. isWritable = menu.writePermission ∈ admin.permissions  OR  'ALL'
   * 5. Level 1: 자식 1개 이상인 그룹만 포함
   */
  async getMenusByAdmin(
    permissions: string[],
    companyType: string,
    scope?: string,
  ): Promise<MenuTreeItem[]> {
    this.logger.log(`Fetching menus for companyType=${companyType}, scope=${scope}, permissions=[${permissions.join(',')}]`);

    const hasAll = permissions.includes('ALL');
    const adminScope = scope || (companyType === 'FRANCHISE' ? 'COMPANY' : 'PLATFORM');

    // Level 1 그룹 메뉴 (parentId가 null인 것들)와 Level 2 자식 메뉴를 한 번에 조회
    const allMenus = await this.prisma.menuMaster.findMany({
      where: { isActive: true },
      include: {
        menuPermissions: true,
        menuCompanyTypes: true,
        children: {
          where: { isActive: true },
          include: {
            menuPermissions: true,
            menuCompanyTypes: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Level 1 그룹만 필터링 (parentId가 null)
    const groups = allMenus.filter((m) => m.parentId === null);

    const result: MenuTreeItem[] = [];

    for (const group of groups) {
      // 그룹 필터링
      if (!this.isMenuAccessible(group, permissions, companyType as CompanyType, adminScope, hasAll)) {
        continue;
      }

      // 자식 메뉴 필터링
      const filteredChildren: MenuChildItem[] = [];
      for (const child of group.children) {
        if (!this.isMenuAccessible(child, permissions, companyType as CompanyType, adminScope, hasAll)) {
          continue;
        }

        filteredChildren.push({
          id: child.id,
          code: child.code,
          name: child.name,
          path: child.path,
          icon: child.icon,
          sortOrder: child.sortOrder,
          isWritable: this.isWritable(child.writePermission, permissions, hasAll),
        });
      }

      // 자식이 1개 이상인 그룹만 포함
      if (filteredChildren.length > 0) {
        result.push({
          id: group.id,
          code: group.code,
          name: group.name,
          icon: group.icon,
          sortOrder: group.sortOrder,
          children: filteredChildren,
        });
      }
    }

    this.logger.log(`Returning ${result.length} menu groups`);
    return result;
  }

  private isMenuAccessible(
    menu: {
      platformOnly: boolean;
      menuCompanyTypes: { companyType: CompanyType }[];
      menuPermissions: { permissionCode: string }[];
    },
    permissions: string[],
    companyType: CompanyType,
    adminScope: string,
    hasAll: boolean,
  ): boolean {
    // 조건 3: platformOnly 체크
    if (menu.platformOnly && adminScope !== 'PLATFORM') {
      return false;
    }

    // 조건 1: 회사유형 체크
    const menuCompanyTypes = menu.menuCompanyTypes.map((mct) => mct.companyType);
    if (!menuCompanyTypes.includes(companyType)) {
      return false;
    }

    // 조건 2: 권한 체크 (ALL이면 무조건 통과)
    if (hasAll) {
      return true;
    }
    const menuPermissions = menu.menuPermissions.map((mp) => mp.permissionCode);
    const hasMatchingPermission = menuPermissions.some((mp) => permissions.includes(mp));
    return hasMatchingPermission;
  }

  private isWritable(
    writePermission: string | null,
    permissions: string[],
    hasAll: boolean,
  ): boolean {
    if (hasAll) return true;
    if (!writePermission) return false;
    return permissions.includes(writePermission);
  }
}
