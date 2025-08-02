import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '../api/courseApi';
import { Breadcrumb } from '../components/common';
import { PageLayout } from '../components/common/Layout/PageLayout';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin, selectHasPermission } from '../redux/slices/authSlice';
import { CanManageBookings } from '../components/auth/PermissionGuard';
import type { Course, Company } from '../types';

export const BookingManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const hasManageBookings = useSelector(selectHasPermission('MANAGE_BOOKINGS'));
  const [courses, setCourses] = useState<Course[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);

  // 회사 목록 조회 (권한에 따른 필터링)
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesData = await courseApi.getCompanies();
        
        // 권한에 따른 회사 필터링
        let filteredCompanies = companiesData;
        if (currentAdmin) {
          if (currentAdmin.scope === 'COMPANY' && currentAdmin.companyId) {
            // 회사 관리자는 자신의 회사만 볼 수 있음
            filteredCompanies = companiesData.filter(c => c.id === currentAdmin.companyId);
          } else if (currentAdmin.scope === 'COURSE') {
            // 코스 관리자는 회사 선택 불가
            filteredCompanies = [];
          }
          // 플랫폼 관리자는 모든 회사 볼 수 있음
        }
        
        setCompanies(filteredCompanies);
        
        // 첫 번째 회사 자동 선택
        if (filteredCompanies.length > 0) {
          setSelectedCompany(filteredCompanies[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
        setError('회사 목록을 불러오는데 실패했습니다.');
      }
    };

    fetchCompanies();
  }, [currentAdmin]);

  // 선택된 회사의 코스 목록 조회 (권한에 따른 필터링)
  useEffect(() => {
    const fetchCourses = async () => {
      if (!selectedCompany && currentAdmin?.scope !== 'COURSE') return;

      setLoading(true);
      setError(null);

      try {
        let coursesData: Course[] = [];
        
        if (currentAdmin?.scope === 'COURSE' && currentAdmin.courseIds) {
          // 코스 관리자는 담당 코스만 조회
          const allCourses = await courseApi.getAllCourses();
          coursesData = allCourses.filter(course => 
            currentAdmin.courseIds?.includes(course.id)
          );
        } else if (selectedCompany) {
          // 회사/플랫폼 관리자는 선택된 회사의 코스 조회
          coursesData = await courseApi.getCoursesByCompany(selectedCompany);
        }
        
        setCourses(coursesData);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        setError('코스 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [selectedCompany, currentAdmin]);

  // 코스 예약 관리로 이동
  const handleCourseSelect = (courseId: number) => {
    navigate(`/courses/${courseId}/bookings`);
  };

  return (
    <CanManageBookings
      fallback={
        <PageLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600">예약 관리 권한이 필요합니다.</p>
          </div>
        </PageLayout>
      }
    >
      <PageLayout>
        <Breadcrumb 
          items={[
            { label: '예약 관리', icon: '📅' }
          ]}
        />

        <PageLayout.Header>
          <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
          <p className="text-gray-600 mt-2">코스를 선택하여 예약을 관리하세요.</p>
        </PageLayout.Header>

        <PageLayout.Content>

      {/* 회사 선택 (코스 관리자는 표시하지 않음) */}
      {currentAdmin?.scope !== 'COURSE' && companies.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            회사 선택
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => setSelectedCompany(company.id)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedCompany === company.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="font-medium text-gray-900">{company.name}</div>
                {company.description && (
                  <div className="text-sm text-gray-500 mt-1">{company.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* 코스 목록 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          코스 선택
          {selectedCompany && currentAdmin?.scope !== 'COURSE' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({companies.find(c => c.id === selectedCompany)?.name})
            </span>
          )}
          {currentAdmin?.scope === 'COURSE' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (담당 코스)
            </span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">코스 목록을 불러오는 중...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {currentAdmin?.scope === 'COURSE' 
                ? '담당하는 코스가 없습니다.' 
                : selectedCompany 
                  ? '등록된 코스가 없습니다.' 
                  : '회사를 선택해주세요.'
              }
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleCourseSelect(course.id)}
              >
                <div className="p-6">
                  {/* 코스 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {course.name}
                      </h3>
                      {course.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* 코스 정보 */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {course.address && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{course.address}</span>
                      </div>
                    )}
                    
                    {course.phoneNumber && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{course.phoneNumber}</span>
                      </div>
                    )}

                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>{course.numberOfHoles || 0}홀</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.isActive ? '운영중' : '운영중지'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      <span>예약 관리</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 빠른 액세스 섹션 */}
      {courses.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 액세스</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                // 오늘 예약이 많은 코스로 이동 (임시로 첫 번째 코스)
                if (courses.length > 0) {
                  handleCourseSelect(courses[0].id);
                }
              }}
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <div className="text-blue-600 font-medium">오늘의 예약 현황</div>
              <div className="text-sm text-gray-600 mt-1">가장 많은 예약이 있는 코스로 이동</div>
            </button>

            <button
              onClick={() => {
                // 예약 대기가 있는 코스로 이동 (임시로 첫 번째 코스)
                if (courses.length > 0) {
                  handleCourseSelect(courses[0].id);
                }
              }}
              className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-left"
            >
              <div className="text-yellow-600 font-medium">대기 중인 예약</div>
              <div className="text-sm text-gray-600 mt-1">확인이 필요한 예약 관리</div>
            </button>

            <button
              onClick={() => {
                // 새 예약이 가능한 코스로 이동 (임시로 첫 번째 코스)
                if (courses.length > 0) {
                  handleCourseSelect(courses[0].id);
                }
              }}
              className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
            >
              <div className="text-green-600 font-medium">새 예약 등록</div>
              <div className="text-sm text-gray-600 mt-1">빠른 예약 등록</div>
            </button>
          </div>
        </div>
      )}
        </PageLayout.Content>
      </PageLayout>
    </CanManageBookings>
  );
};