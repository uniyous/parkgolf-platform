import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Pencil, Trash2, AlertTriangle, Map } from 'lucide-react';
import { useCompaniesQuery, useDeleteCompanyMutation, useUpdateCompanyStatusMutation } from '@/hooks/queries';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import { Modal } from '@/components/ui';
import { DataContainer } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
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
  SUSPENDED: '정지',
  PENDING: '대기',
};

// 상태별 스타일 정보
const STATUS_META: Record<CompanyStatus, { icon: string; color: string }> = {
  ACTIVE: { icon: '✅', color: 'bg-green-100 text-green-800 border-green-200' },
  INACTIVE: { icon: '⏸️', color: 'bg-red-100 text-red-800 border-red-200' },
  MAINTENANCE: { icon: '🔧', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SUSPENDED: { icon: '🚫', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  PENDING: { icon: '⏳', color: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export const CompanyList: React.FC = () => {
  // Queries & Mutations
  const { data: companiesResponse, refetch, isLoading } = useCompaniesQuery();
  const deleteCompany = useDeleteCompanyMutation();
  const updateStatus = useUpdateCompanyStatusMutation();

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
              <Plus className="w-5 h-5 mr-2" />
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

      {/* 필터 */}
      <FilterContainer columns={4}>
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => setFilters((f) => ({ ...f, search: value }))}
          placeholder="회사명, 사업자번호, 주소, 연락처..."
        />
        <FilterSelect
          label="상태"
          value={filters.status === 'ALL' ? '' : filters.status}
          onChange={(value) => setFilters((f) => ({ ...f, status: (value || 'ALL') as CompanyStatus | 'ALL' }))}
          options={[
            { value: 'ACTIVE', label: '운영 중' },
            { value: 'MAINTENANCE', label: '점검 중' },
            { value: 'INACTIVE', label: '비활성' },
          ]}
          placeholder="전체 상태"
        />
        <div className="flex items-end gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <FilterResetButton
            hasActiveFilters={!!(filters.search || filters.status !== 'ALL')}
            onClick={() => setFilters({ search: '', status: 'ALL' })}
            variant="text"
          />
        </div>
      </FilterContainer>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
          ...(filters.status !== 'ALL' ? [{ id: 'status', label: '상태', value: STATUS_LABELS[filters.status], color: 'blue' as const }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters(f => ({ ...f, search: '' }));
          if (id === 'status') setFilters(f => ({ ...f, status: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', status: 'ALL' })}
      />

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
        <DataContainer
          isLoading={isLoading}
          isEmpty={filteredCompanies.length === 0}
          emptyIcon="🔍"
          emptyMessage={companies.length === 0 ? '등록된 회사가 없습니다' : '검색 결과가 없습니다'}
          emptyDescription={companies.length === 0 ? '새 회사를 추가해 보세요' : '다른 검색어나 필터를 시도해 보세요'}
          emptyAction={
            companies.length === 0 && hasManageCompanies ? (
              <button
                onClick={() => setFormModal({ open: true })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                회사 추가
              </button>
            ) : undefined
          }
          loadingMessage="회사 목록을 불러오는 중..."
        >
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
                        <Map className="w-4 h-4 mr-1 text-gray-500" />
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
                              <Pencil className="w-4 h-4 mr-1" />
                              수정
                            </button>
                            {currentAdmin?.primaryScope === 'PLATFORM' && (
                              <button
                                onClick={() => setDeleteConfirm({ open: true, company })}
                                className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
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
        </DataContainer>
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
                <AlertTriangle className="w-6 h-6 text-red-600" />
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
