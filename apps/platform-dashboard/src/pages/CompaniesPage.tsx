import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useCompaniesQuery, useDeleteCompanyMutation, useUpdateCompanyStatusMutation } from '@/hooks/queries';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import { DataContainer, Pagination, DeleteConfirmPopover } from '@/components/common';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterResetButton,
  ActiveFilterTags,
} from '@/components/common/filters';
import { CompanyFormModal } from '@/components/features/company';
import { PageLayout } from '@/components/layout';
import type { Company, CompanyStatus, CompanyType } from '@/types/company';

type SortField = 'name' | 'status' | 'createdAt';
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
  ACTIVE: { icon: '✅', color: 'bg-green-500/20 text-green-400 border-green-200' },
  INACTIVE: { icon: '⏸️', color: 'bg-red-500/20 text-red-400 border-red-200' },
  MAINTENANCE: { icon: '🔧', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-200' },
  SUSPENDED: { icon: '🚫', color: 'bg-white/10 text-white border-white/15' },
  PENDING: { icon: '⏳', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const COMPANY_TYPE_META: Record<CompanyType, { label: string; color: string }> = {
  PLATFORM: { label: '본사', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ASSOCIATION: { label: '협회', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  FRANCHISE: { label: '가맹점', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export const CompaniesPage: React.FC = () => {
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 20;

  // Queries & Mutations
  const { data: companiesResponse, isLoading } = useCompaniesQuery(undefined, page, limit);
  const deleteCompany = useDeleteCompanyMutation();
  const updateStatus = useUpdateCompanyStatusMutation();

  const companies = companiesResponse?.data || [];
  const pagination = companiesResponse?.pagination ?? { total: 0, page: 1, limit, totalPages: 0 };

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

  // Modal State
  const [formModal, setFormModal] = useState<{ open: boolean; company?: Company }>({ open: false });

  // Filtered & Sorted Data
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

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

    if (filters.status !== 'ALL') {
      result = result.filter((c) => c.status === filters.status);
    }

    result.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, filters, sortField, sortDirection]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (company: Company) => {
    await deleteCompany.mutateAsync(company.id);
  };

  const handleStatusChange = async (company: Company, status: CompanyStatus) => {
    await updateStatus.mutateAsync({ id: company.id, status });
  };

  return (
    <PageLayout>
      {/* 헤더 카드 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">회사 관리</h2>
            <p className="mt-1 text-sm text-white/50">
              골프장 운영 회사를 관리하고 상태를 설정합니다
            </p>
          </div>
          {hasManageCompanies && (
            <button
              onClick={() => setFormModal({ open: true })}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              회사 추가
            </button>
          )}
        </div>
      </div>

      {/* 필터 */}
      <FilterContainer columns="flex">
        <FilterSelect
          label="상태"
          showLabel
          value={filters.status === 'ALL' ? '' : filters.status}
          onChange={(value) => { setFilters((f) => ({ ...f, status: (value || 'ALL') as CompanyStatus | 'ALL' })); setPage(1); }}
          options={[
            { value: 'ACTIVE', label: '운영 중' },
            { value: 'MAINTENANCE', label: '점검 중' },
            { value: 'INACTIVE', label: '비활성' },
          ]}
          placeholder="전체 상태"
        />
        <FilterSearch
          label="검색"
          showLabel
          value={filters.search}
          onChange={(value) => { setFilters((f) => ({ ...f, search: value })); setPage(1); }}
          placeholder="회사명, 사업자번호..."
        />
        <div className="ml-auto flex items-end">
        <FilterResetButton
          hasActiveFilters={!!(filters.search || filters.status !== 'ALL')}
          onClick={() => { setFilters({ search: '', status: 'ALL' }); setPage(1); }}
        />
        </div>
      </FilterContainer>

      {/* 활성 필터 태그 */}
      <ActiveFilterTags
        filters={[
          ...(filters.search ? [{ id: 'search', label: '검색', value: filters.search }] : []),
          ...(filters.status !== 'ALL' ? [{ id: 'status', label: '상태', value: STATUS_LABELS[filters.status], color: 'violet' as const }] : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') setFilters(f => ({ ...f, search: '' }));
          if (id === 'status') setFilters(f => ({ ...f, status: 'ALL' }));
        }}
        onResetAll={() => setFilters({ search: '', status: 'ALL' })}
      />

      {/* 회사 목록 테이블 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/15">
          <h3 className="text-lg font-medium text-white">
            회사 목록
            <span className="ml-2 text-sm font-normal text-white/50">
              ({filteredCompanies.length}개)
            </span>
          </h3>
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
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                회사 추가
              </button>
            ) : undefined
          }
          loadingMessage="회사 목록을 불러오는 중..."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/15">
              <thead className="bg-white/5">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>회사 정보</span>
                      {sortField === 'name' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase">유형</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>상태</span>
                      {sortField === 'status' && (
                        <span className="text-emerald-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {filteredCompanies.map((company) => {
                  const typeMeta = COMPANY_TYPE_META[company.companyType];
                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold overflow-hidden">
                            {company.logoUrl ? (
                              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                            ) : (
                              company.name?.charAt(0) || '?'
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{company.name}</div>
                            <div className="text-sm text-white/50 max-w-xs truncate">{company.address || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-white">{company.phoneNumber || '-'}</div>
                        <div className="text-sm text-white/50">{company.email || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {typeMeta ? (
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${typeMeta.color}`}>
                            {typeMeta.label}
                          </span>
                        ) : (
                          <span className="text-sm text-white/50">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
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
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasManageCompanies && (
                            <>
                              <button
                                onClick={() => setFormModal({ open: true, company })}
                                className="inline-flex items-center px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                수정
                              </button>
                              {currentAdmin?.primaryScope === 'PLATFORM' && (
                                <DeleteConfirmPopover
                                  targetName={company.name}
                                  message={`"${company.name}" 회사를 삭제하시겠습니까? 회사와 관련된 모든 데이터가 영구적으로 삭제됩니다.`}
                                  isDeleting={deleteCompany.isPending}
                                  onConfirm={() => handleDelete(company)}
                                  side="left"
                                >
                                  <button
                                    className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    삭제
                                  </button>
                                </DeleteConfirmPopover>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataContainer>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Form Modal */}
      <CompanyFormModal
        open={formModal.open}
        company={formModal.company}
        onClose={() => setFormModal({ open: false })}
      />

    </PageLayout>
  );
};
