import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useCreateGameMutation, useClubsQuery, useCoursesByClubQuery } from '@/hooks/queries';
import { Button } from '@/components/ui';
import type { Game, CreateGameDto } from '@/lib/api/gamesApi';

interface GameFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (game: Game) => void;
}

interface FormData {
  clubId: number | null;
  name: string;
  description: string;
  courseIds: number[];
  maxPlayers: number;
  duration: number;
  price: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

const initialFormData: FormData = {
  clubId: null,
  name: '',
  description: '',
  courseIds: [],
  maxPlayers: 4,
  duration: 120,
  price: 0,
  status: 'ACTIVE',
};

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '운영중', icon: '✅', color: 'bg-green-100 text-green-800' },
  { value: 'MAINTENANCE', label: '정비중', icon: '🔧', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'INACTIVE', label: '비활성', icon: '⏸️', color: 'bg-red-100 text-red-800' },
];

export const GameFormModal: React.FC<GameFormModalProps> = ({ open, onClose, onSuccess }) => {
  const createGame = useCreateGameMutation();
  const { data: clubsData } = useClubsQuery();
  const clubs = clubsData?.data || [];

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // 선택된 클럽의 코스 목록
  const { data: coursesData } = useCoursesByClubQuery(formData.clubId ?? 0);
  const courses = Array.isArray(coursesData) ? coursesData : [];

  useEffect(() => {
    if (open) {
      setFormData(initialFormData);
      setErrors({});
    }
  }, [open]);

  // 클럽 변경 시 코스 선택 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, courseIds: [] }));
  }, [formData.clubId]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.clubId) {
      newErrors.clubId = '골프장을 선택해주세요.';
    }

    if (!formData.name.trim()) {
      newErrors.name = '라운드 이름을 입력해주세요.';
    }

    if (formData.courseIds.length === 0) {
      newErrors.courseIds = '최소 1개 이상의 코스를 선택해주세요.';
    }

    if (formData.maxPlayers < 1 || formData.maxPlayers > 10) {
      newErrors.maxPlayers = '최대 인원은 1~10명 사이여야 합니다.';
    }

    if (formData.duration < 30 || formData.duration > 300) {
      newErrors.duration = '소요 시간은 30~300분 사이여야 합니다.';
    }

    if (formData.price < 0) {
      newErrors.price = '가격은 0 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const dto: CreateGameDto = {
        clubId: formData.clubId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        courseIds: formData.courseIds,
        maxPlayers: formData.maxPlayers,
        duration: formData.duration,
        price: formData.price,
        status: formData.status,
      };

      const result = await createGame.mutateAsync(dto);
      onSuccess?.(result);
      onClose();
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCourseToggle = (courseId: number) => {
    setFormData(prev => {
      const newCourseIds = prev.courseIds.includes(courseId)
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId];
      return { ...prev, courseIds: newCourseIds };
    });
    if (errors.courseIds) {
      setErrors(prev => ({ ...prev, courseIds: undefined }));
    }
  };

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <p className="mt-1.5 text-sm text-red-500 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {message}
      </p>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden focus:outline-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>새 라운드 추가</Dialog.Title>
          </VisuallyHidden.Root>

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    새 라운드 등록
                  </h2>
                  <p className="text-emerald-100 text-sm mt-0.5">
                    새로운 라운드를 등록합니다
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* 기본 정보 섹션 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900">기본 정보</h3>
                </div>

                <div className="space-y-4">
                  {/* 골프장 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      골프장 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <select
                        value={formData.clubId ?? ''}
                        onChange={(e) => handleChange('clubId', e.target.value ? Number(e.target.value) : null)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors appearance-none bg-white ${
                          errors.clubId ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">골프장을 선택하세요</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <ErrorMessage message={errors.clubId} />
                  </div>

                  {/* 라운드 이름 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      라운드 이름 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                          errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                        placeholder="예: A+B 코스 18홀"
                      />
                    </div>
                    <ErrorMessage message={errors.name} />
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">설명</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-colors resize-none"
                      placeholder="라운드에 대한 설명을 입력하세요"
                    />
                  </div>
                </div>
              </div>

              {/* 코스 선택 섹션 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900">코스 선택 <span className="text-red-500">*</span></h3>
                </div>

                {!formData.clubId ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    먼저 골프장을 선택해주세요
                  </div>
                ) : !courses || courses.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    선택한 골프장에 등록된 코스가 없습니다
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {courses.map((course) => (
                      <label
                        key={course.id}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.courseIds.includes(course.id)
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          formData.courseIds.includes(course.id)
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.courseIds.includes(course.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.courseIds.includes(course.id)}
                          onChange={() => handleCourseToggle(course.id)}
                          className="sr-only"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">{course.name}</span>
                          {course.code && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {course.code}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <ErrorMessage message={errors.courseIds} />
              </div>

              {/* 운영 정보 섹션 */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900">운영 정보</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 최대 인원 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      최대 인원 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <input
                        type="number"
                        value={formData.maxPlayers}
                        onChange={(e) => handleChange('maxPlayers', Number(e.target.value))}
                        min={1}
                        max={10}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                          errors.maxPlayers ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-gray-500">명</span>
                      </div>
                    </div>
                    <ErrorMessage message={errors.maxPlayers} />
                  </div>

                  {/* 소요 시간 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      소요 시간 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => handleChange('duration', Number(e.target.value))}
                        min={30}
                        max={300}
                        step={10}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                          errors.duration ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-gray-500">분</span>
                      </div>
                    </div>
                    <ErrorMessage message={errors.duration} />
                  </div>

                  {/* 가격 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      가격 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 font-medium">₩</span>
                      </div>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleChange('price', Number(e.target.value))}
                        min={0}
                        step={1000}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                          errors.price ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-sm text-gray-500">원</span>
                      </div>
                    </div>
                    <ErrorMessage message={errors.price} />
                  </div>
                </div>

                {/* 운영 상태 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">운영 상태</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleChange('status', option.value)}
                        className={`flex items-center justify-center px-4 py-2.5 rounded-lg border-2 transition-all ${
                          formData.status === option.value
                            ? `${option.color} border-current font-medium shadow-sm`
                            : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                        }`}
                      >
                        <span className="mr-1.5">{option.icon}</span>
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" loading={createGame.isPending}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                라운드 등록
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
