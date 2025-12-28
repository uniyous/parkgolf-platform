import React, { useState, useMemo } from 'react';
import { useCompanies, useDeleteCompany, useUpdateCompanyStatus } from '@/hooks/queries';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import { Modal } from '@/components/ui';
import { CompanyFormModal } from './CompanyFormModal';
import { CompanyDetailModal } from './CompanyDetailModal';
import type { Company, CompanyStatus } from '@/types/company';

type SortField = 'name' | 'status' | 'coursesCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  status: CompanyStatus | 'ALL';
}

const STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  MAINTENANCE: '점검',
};

// 상태별 스타일 정보
const STATUS_META: Record<CompanyStatus, { icon: string; color: string }> = {
  ACTIVE: { icon: '✅', color: 'bg-green-100 text-green-800 border-green-200' },
  INACTIVE: { icon: '⏸️', color: 'bg-red-100 text-red-800 border-red-200' },
  MAINTENANCE: { icon: '🔧', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

export const CompanyList: React.FC = () => {
  // Queries & Mutations
  const { data: companiesResponse, refetch } = useCompanies();
  const deleteCompany = useDeleteCompany();
  const updateStatus = useUpdateCompanyStatus();

  const companies = companiesResponse?.data || [];

  // Auth
  const currentAdmin = useCurrentAdmin();
  const hasManageCompanies = useAuthStore((state) => state.hasPermission('COMPANIES'));

  // Local UI State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'ALL',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State
  const [formModal, setFormModal] = useState<{ open: boolean; company?: Company }>({ open: false });
  const [detailModal, setDetailModal] = useState<{ open: boolean; company?: Company }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; company?: Company }>({ open: false });

  // Filtered & Sorted Data
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((c) =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.businessNumber?.includes(filters.search) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.address?.toLowerCase().includes(searchLower) ||
        c.phoneNumber?.includes(filters.search)
      );
    }

    // Status filter
    if (filters.status !== 'ALL') {
      result = result.filter((c) => c.status === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'createdAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, filters, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: companies.length,
    active: companies.filter((c) => c.status === 'ACTIVE').length,
    maintenance: companies.filter((c) => c.status === 'MAINTENANCE').length,
    inactive: companies.filter((c) => c.status === 'INACTIVE').length,
  }), [companies]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.company) return;
    try {
      await deleteCompany.mutateAsync(deleteConfirm.company.id);
      setDeleteConfirm({ open: false });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStatusChange = async (company: Company, status: CompanyStatus) => {
    try {
      await updateStatus.mutateAsync({ id: company.id, status });
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCompanies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCompanies.map((c) => c.id));
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">회사 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              골프장 운영 회사를 관리하고 상태를 설정합니다
            </p>
          </div>
          {hasManageCompanies && (
            <button
              onClick={() => setFormModal({ open: true })}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              회사 추가
            </button>
          )}
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-600">전체 회사</div>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-green-600">운영 중</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
                <div className="text-sm text-yellow-600">점검 중</div>
              </div>
              <div className="text-3xl">🔧</div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                <div className="text-sm text-red-600">비활성</div>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 & 검색 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="회사명, 사업자번호, 주소, 연락처 검색..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as CompanyStatus | 'ALL' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">운영 중</option>
              <option value="MAINTENANCE">점검 중</option>
              <option value="INACTIVE">비활성</option>
            </select>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새로고침
            </button>
          </div>
        </div>
        {(filters.search || filters.status !== 'ALL') && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">필터:</span>
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 rounded-full">
                검색: {filters.search}
                <button onClick={() => setFilters(f => ({ ...f, search: '' }))} className="ml-1 text-gray-400 hover:text-gray-600">×</button>
              </span>
            )}
            {filters.status !== 'ALL' && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                상태: {STATUS_LABELS[filters.status]}
                <button onClick={() => setFilters(f => ({ ...f, status: 'ALL' }))} className="ml-1 text-blue-400 hover:text-blue-600">×</button>
              </span>
            )}
            <button
              onClick={() => setFilters({ search: '', status: 'ALL' })}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              모두 초기화
            </button>
          </div>
        )}
      </div>

      {/* 회사 목록 테이블 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            회사 목록
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredCompanies.length}개)
            </span>
          </h3>
          {selectedIds.length > 0 && (
            <span className="text-sm text-blue-600">{selectedIds.length}개 선택됨</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredCompanies.length && filteredCompanies.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>회사 정보</span>
                    {sortField === 'name' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  연락처
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('coursesCount')}
                >
                  <div className="flex items-center space-x-1">
                    <span>코스</span>
                    {sortField === 'coursesCount' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>상태</span>
                    {sortField === 'status' && (
                      <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setDetailModal({ open: true, company })}
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(company.id)}
                      onChange={() => handleSelect(company.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          company.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{company.address || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{company.phoneNumber || '-'}</div>
                    <div className="text-sm text-gray-500">{company.email || '-'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg">
                      <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      {company.coursesCount || 0}개
                    </span>
                  </td>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    {hasManageCompanies ? (
                      <select
                        value={company.status}
                        onChange={(e) => handleStatusChange(company, e.target.value as CompanyStatus)}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer transition-colors ${STATUS_META[company.status]?.color}`}
                      >
                        <option value="ACTIVE">운영 중</option>
                        <option value="MAINTENANCE">점검 중</option>
                        <option value="INACTIVE">비활성</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border ${STATUS_META[company.status]?.color}`}>
                        <span className="mr-1">{STATUS_META[company.status]?.icon}</span>
                        {STATUS_LABELS[company.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {hasManageCompanies && (
                        <>
                          <button
                            onClick={() => setFormModal({ open: true, company })}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            수정
                          </button>
                          {currentAdmin?.scope === 'SYSTEM' && (
                            <button
                              onClick={() => setDeleteConfirm({ open: true, company })}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              삭제
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {companies.length === 0 ? '등록된 회사가 없습니다' : '검색 결과가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-4">
              {companies.length === 0
                ? '새 회사를 추가해 보세요'
                : '다른 검색어나 필터를 시도해 보세요'}
            </p>
            {companies.length === 0 && hasManageCompanies && (
              <button
                onClick={() => setFormModal({ open: true })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                회사 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <CompanyFormModal
        open={formModal.open}
        company={formModal.company}
        onClose={() => setFormModal({ open: false })}
      />

      {/* Detail Modal */}
      <CompanyDetailModal
        open={detailModal.open}
        company={detailModal.company}
        onClose={() => setDetailModal({ open: false })}
        onEdit={(company) => {
          setDetailModal({ open: false });
          setFormModal({ open: true, company });
        }}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteConfirm.open && !!deleteConfirm.company}
        onClose={() => setDeleteConfirm({ open: false })}
        title="회사 삭제"
        maxWidth="sm"
      >
        {deleteConfirm.company && (
          <>
            <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg mb-6">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">{deleteConfirm.company.name}</div>
                <div className="text-sm text-gray-500">{deleteConfirm.company.address || '-'}</div>
              </div>
            </div>
            <p className="text-gray-600 mb-2">
              이 회사를 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-600 mb-6">
              이 작업은 되돌릴 수 없습니다. 회사와 관련된 모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteCompany.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteCompany.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
