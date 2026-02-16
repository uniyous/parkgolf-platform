import { apiClient } from './client';
import { extractList } from './bffParser';

// ============================================
// 메뉴 타입
// ============================================

export interface MenuChildItem {
  id: number;
  code: string;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isWritable: boolean;
}

export interface MenuTreeItem {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  children: MenuChildItem[];
}

// ============================================
// API 호출
// ============================================

export const menuApi = {
  /**
   * 관리자 권한 기반 메뉴 트리 조회
   */
  getMenusByAdmin: async (
    permissions: string[],
    companyType: string,
    scope?: string,
  ): Promise<MenuTreeItem[]> => {
    const response = await apiClient.get<unknown>('/admin/menus', {
      permissions: permissions.join(','),
      companyType,
      scope,
    });
    return extractList<MenuTreeItem>(response.data);
  },
};
