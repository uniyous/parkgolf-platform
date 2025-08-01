import React, { useEffect } from 'react';
import { EnhancedCompanyList } from './EnhancedCompanyList';
import { CompanyDetailView } from './CompanyDetailView';
import { CompanyForm } from './CompanyForm';
import { CompanyStats } from './CompanyStats';
import { PageHeader, PageHeaderAction } from '../common/PageHeader';
import { useCompanyManagement } from '../../redux/hooks/useCompanyManagement';
import type { Company, CompanyStatus } from '../../types/company';

export const CompanyManagementContainer: React.FC = () => {
  const {
    // 상태
    companies,
    selectedCompany,
    viewMode,
    filters,
    loading,
    error,
    
    // 액션들
    actions: {
      loadCompanies,
      handleCreateCompany,
      handleUpdateCompany,
      handleDeleteCompany,
      changeCompanyStatus,
      viewCompanyDetail,
      editCompany,
      createCompanyMode,
      backToList
    }
  } = useCompanyManagement();

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // 이벤트 핸들러들
  const handleCreateNew = () => {
    createCompanyMode();
  };

  const handleEdit = (company: Company) => {
    editCompany(company);
  };

  const handleView = (company: Company) => {
    viewCompanyDetail(company);
  };

  const handleDelete = async (company: Company) => {
    const result = await handleDeleteCompany(company);
    if (result.success) {
      alert('회사가 성공적으로 삭제되었습니다.');
    } else if (result.error) {
      alert(`삭제 실패: ${result.error}`);
    }
    // cancelled인 경우 아무것도 하지 않음
  };

  const handleStatusUpdate = async (company: Company, status: CompanyStatus) => {
    try {
      await changeCompanyStatus(company.id, status);
      alert(`회사 상태가 ${status === 'ACTIVE' ? '활성' : status === 'MAINTENANCE' ? '점검' : '비활성'}으로 변경되었습니다.`);
    } catch (error: any) {
      alert(`상태 변경 실패: ${error.message}`);
    }
  };

  const handleFormSuccess = async (companyData: Partial<Company>) => {
    // CompanyForm에서 직접 Redux action을 디스패치하므로
    // 여기서는 화면 전환만 처리
    backToList();
  };

  const handleFormCancel = () => {
    backToList();
  };

  const handleBack = () => {
    backToList();
  };

  // 페이지 제목 및 부제목 설정
  const getPageTitle = () => {
    switch (viewMode) {
      case 'detail': return '회사 상세 정보';
      case 'create': return '새 회사 등록';
      case 'edit': return '회사 정보 수정';
      default: return '회사 관리';
    }
  };

  const getPageSubtitle = () => {
    switch (viewMode) {
      case 'detail': return '회사의 상세 정보와 운영 현황을 확인합니다.';
      case 'create': return '새로운 골프장 운영 회사를 등록합니다.';
      case 'edit': return '회사의 기본 정보를 수정합니다.';
      default: return '골프장 운영 회사들을 관리합니다.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Page Header */}
      <PageHeader
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        onBack={viewMode !== 'list' ? handleBack : undefined}
        backLabel="목록으로"
      />

      {/* Error Display */}
      {(error.list || error.create || error.update || error.delete) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error.list || error.create || error.update || error.delete}
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <>
          {/* Statistics */}
          <CompanyStats companies={companies} />

          {/* Enhanced Company List */}
          <EnhancedCompanyList
            companies={companies} 
            isLoading={loading.list}
            onSelectCompany={handleView}
            onCreateCompany={handleCreateNew}
            onEditCompany={handleEdit}
            onDeleteCompany={handleDelete}
            onUpdateStatus={handleStatusUpdate}
            onRefresh={() => loadCompanies()}
          />
        </>
      )}

      {viewMode === 'detail' && selectedCompany && (
        <CompanyDetailView
          company={selectedCompany}
          onEdit={() => handleEdit(selectedCompany)}
          onDelete={() => handleDelete(selectedCompany)}
          onUpdateStatus={(status) => handleStatusUpdate(selectedCompany, status)}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <CompanyForm
          company={viewMode === 'edit' ? selectedCompany : null}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          isLoading={loading.create || loading.update}
        />
      )}
    </div>
  );
};