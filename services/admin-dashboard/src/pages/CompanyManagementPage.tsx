import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { useConfirmation, useModal, useFormManager } from '../hooks';
import { useGolfCourseManagement } from '../redux/hooks/useCourse';
import type { Company, CompanyInput } from '../types';

const initialFormData: CompanyInput = {
  name: '',
  businessNumber: '',
  address: '',
  phone: '',
  email: '',
  status: 'active',
};

export const CompanyManagementPage: React.FC = () => {
  const { companies, fetchCompanies } = useGolfCourseManagement();
  
  useEffect(() => {
    // 회사 목록을 가져옴 (API 내에서 개발 환경 처리)
    fetchCompanies();
  }, []); // 빈 의존성 배열로 한 번만 실행
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Modal and form management
  const addModal = useModal();
  const editModal = useModal();
  const deleteConfirmation = useConfirmation();

  // Form management
  const addForm = useFormManager(initialFormData, {
    validationSchema: (data) => {
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = '회사명은 필수입니다';
      if (!data.businessNumber.trim()) errors.businessNumber = '사업자번호는 필수입니다';
      if (!data.address.trim()) errors.address = '주소는 필수입니다';
      if (!data.phone.trim()) errors.phone = '전화번호는 필수입니다';
      if (!data.email.trim()) errors.email = '이메일은 필수입니다';
      return errors;
    },
    onSubmit: async (data) => {
      // TODO: Replace with real API call
      const newCompany: Company = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Note: This should be replaced with actual API call
      console.log('Creating company:', newCompany);
      addModal.close();
      addForm.reset();
    },
  });

  const editForm = useFormManager(initialFormData, {
    validationSchema: (data) => {
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = '회사명은 필수입니다';
      if (!data.businessNumber.trim()) errors.businessNumber = '사업자번호는 필수입니다';
      if (!data.address.trim()) errors.address = '주소는 필수입니다';
      if (!data.phone.trim()) errors.phone = '전화번호는 필수입니다';
      if (!data.email.trim()) errors.email = '이메일은 필수입니다';
      return errors;
    },
    onSubmit: async (data) => {
      if (!selectedCompany) return;
      
      // TODO: Replace with real API call
      const updatedCompany: Company = {
        ...selectedCompany,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      // Note: This should be replaced with actual API call
      console.log('Updating company:', updatedCompany);
      editModal.close();
      editForm.reset();
      setSelectedCompany(null);
    },
  });

  // Event handlers
  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    editForm.setData({
      name: company.name,
      businessNumber: company.businessNumber,
      address: company.address,
      phone: company.phone,
      email: company.email,
      status: company.status,
    });
    editModal.open();
  };

  const handleDelete = async (company: Company) => {
    const confirmed = await deleteConfirmation.show({
      title: '회사 삭제',
      message: `"${company.name}" 회사를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    });
    
    if (confirmed) {
      // TODO: Replace with real API call
      console.log('Deleting company:', company.id);
      // After successful deletion, refresh the list
      fetchCompanies();
    }
  };

  const handleStatusToggle = (company: Company) => {
    const newStatus: 'active' | 'inactive' = company.status === 'active' ? 'inactive' : 'active';
    // TODO: Replace with real API call
    console.log('Updating company status:', company.id, newStatus);
    // After successful update, refresh the list
    fetchCompanies();
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter((company: Company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.businessNumber.includes(searchTerm) ||
    company.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
      <Breadcrumb 
        items={[
          { label: '회사 관리', icon: '🏢' }
        ]}
      />
      
      <PageLayout.Header>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">회사 관리</h1>
            <p className="mt-2 text-sm text-gray-600">골프장 운영 회사를 관리할 수 있습니다.</p>
          </div>
          <Button onClick={addModal.open}>
            새 회사 추가
          </Button>
        </div>
      </PageLayout.Header>

      <PageLayout.Content>
        <div className="space-y-6">
          {/* Search and filters */}
          <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="회사명, 사업자번호, 주소로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Companies table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            등록된 회사 ({filteredCompanies.length}개)
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredCompanies.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 회사가 없습니다.'}
            </li>
          ) : (
            filteredCompanies.map((company: Company) => (
              <li key={company.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900">
                        {company.name}
                      </h4>
                      <span
                        className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {company.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>사업자번호: {company.businessNumber}</div>
                      <div>전화번호: {company.phone}</div>
                      <div>이메일: {company.email}</div>
                      <div>등록일: {new Date(company.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      주소: {company.address}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(company)}
                    >
                      {company.status === 'active' ? '비활성화' : '활성화'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(company)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(company)}
                      className="text-red-600 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Add Company Modal */}
      <Modal {...addModal.modalProps} title="새 회사 추가">
        <form onSubmit={addForm.handleSubmit} className="space-y-4">
          <Input
            label="회사명"
            type="text"
            {...addForm.getFieldProps('name')}
            required
          />
          <Input
            label="사업자번호"
            type="text"
            {...addForm.getFieldProps('businessNumber')}
            placeholder="123-45-67890"
            required
          />
          <Input
            label="주소"
            type="text"
            {...addForm.getFieldProps('address')}
            required
          />
          <Input
            label="전화번호"
            type="tel"
            {...addForm.getFieldProps('phone')}
            placeholder="02-1234-5678"
            required
          />
          <Input
            label="이메일"
            type="email"
            {...addForm.getFieldProps('email')}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              {...addForm.getFieldProps('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={addModal.close}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={addForm.isSubmitting}
            >
              {addForm.isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal {...editModal.modalProps} title="회사 정보 수정">
        <form onSubmit={editForm.handleSubmit} className="space-y-4">
          <Input
            label="회사명"
            type="text"
            {...editForm.getFieldProps('name')}
            required
          />
          <Input
            label="사업자번호"
            type="text"
            {...editForm.getFieldProps('businessNumber')}
            placeholder="123-45-67890"
            required
          />
          <Input
            label="주소"
            type="text"
            {...editForm.getFieldProps('address')}
            required
          />
          <Input
            label="전화번호"
            type="tel"
            {...editForm.getFieldProps('phone')}
            placeholder="02-1234-5678"
            required
          />
          <Input
            label="이메일"
            type="email"
            {...editForm.getFieldProps('email')}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              {...editForm.getFieldProps('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={editModal.close}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={editForm.isSubmitting}
            >
              {editForm.isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteConfirmation.isVisible && (
        <Modal
          isOpen={deleteConfirmation.isVisible}
          onClose={deleteConfirmation.hide}
          title={deleteConfirmation.title}
        >
          <div className="space-y-4">
            <p className="text-gray-600">{deleteConfirmation.message}</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={deleteConfirmation.hide}
              >
                취소
              </Button>
              <Button
                onClick={deleteConfirmation.handleConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                삭제
              </Button>
            </div>
          </div>
        </Modal>
      )}
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
};