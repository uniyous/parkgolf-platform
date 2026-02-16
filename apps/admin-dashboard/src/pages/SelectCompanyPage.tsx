import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, MapPin } from 'lucide-react';
import { useCompaniesQuery } from '@/hooks/queries/company';
import { useSupportStore } from '@/stores/support.store';
import type { Company } from '@/types/company';

/**
 * 본사/협회 관리자가 가맹점을 선택하는 페이지
 * scope=PLATFORM인 관리자가 admin-dashboard에 접속할 때 표시
 */
export const SelectCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { setSelectedCompany } = useSupportStore();

  const { data: companiesData, isLoading } = useCompaniesQuery(
    { search: search || undefined, status: 'ACTIVE' },
    1,
    50,
  );

  const companies = companiesData?.data ?? [];

  const handleSelect = (company: Company) => {
    setSelectedCompany(company);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-emerald-50">
            <h1 className="text-lg font-semibold text-gray-900">
              지원할 가맹점을 선택하세요
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              선택한 가맹점의 운영 화면으로 진입합니다
            </p>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="가맹점 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Company List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-6 py-8 text-center text-gray-400">
                불러오는 중...
              </div>
            ) : companies.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">
                {search ? '검색 결과가 없습니다' : '등록된 가맹점이 없습니다'}
              </div>
            ) : (
              <div className="divide-y">
                {companies
                  .filter((c) => c.companyType === 'FRANCHISE')
                  .map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelect(company)}
                      className="w-full px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {company.name}
                          </p>
                          {company.coursesCount != null && (
                            <span className="flex-shrink-0 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              코스 {company.coursesCount}
                            </span>
                          )}
                        </div>
                        {company.address ? (
                          <p className="text-sm text-gray-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {company.address}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {company.code}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
