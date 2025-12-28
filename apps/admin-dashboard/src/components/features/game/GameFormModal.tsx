import React, { useState, useEffect } from 'react';
import { useCreateGame, useClubs, useCoursesByClub } from '@/hooks/queries';
import { Modal } from '@/components/ui';
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

export const GameFormModal: React.FC<GameFormModalProps> = ({ open, onClose, onSuccess }) => {
  const createGame = useCreateGame();
  const { data: clubsData } = useClubs();
  const clubs = clubsData?.data || [];

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // 선택된 클럽의 코스 목록
  const { data: courses } = useCoursesByClub(formData.clubId ?? 0);

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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="새 라운드 추가"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 골프장 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            골프장 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.clubId ?? ''}
            onChange={(e) => handleChange('clubId', e.target.value ? Number(e.target.value) : null)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.clubId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">골프장을 선택하세요</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
          {errors.clubId && <p className="mt-1 text-sm text-red-500">{errors.clubId}</p>}
        </div>

        {/* 라운드 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            라운드 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="예: A+B 코스 18홀"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="라운드에 대한 설명을 입력하세요"
          />
        </div>

        {/* 코스 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            코스 선택 <span className="text-red-500">*</span>
          </label>
          {!formData.clubId ? (
            <p className="text-sm text-gray-500 py-2">먼저 골프장을 선택해주세요.</p>
          ) : !courses || courses.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">선택한 골프장에 등록된 코스가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.courseIds.includes(course.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.courseIds.includes(course.id)}
                    onChange={() => handleCourseToggle(course.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    {course.name} ({course.code})
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.courseIds && <p className="mt-1 text-sm text-red-500">{errors.courseIds}</p>}
        </div>

        {/* 최대 인원 / 소요 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 인원 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => handleChange('maxPlayers', Number(e.target.value))}
              min={1}
              max={10}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.maxPlayers ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maxPlayers && <p className="mt-1 text-sm text-red-500">{errors.maxPlayers}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              소요 시간 (분) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => handleChange('duration', Number(e.target.value))}
              min={30}
              max={300}
              step={10}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.duration ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration}</p>}
          </div>
        </div>

        {/* 가격 / 상태 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              가격 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleChange('price', Number(e.target.value))}
              min={0}
              step={1000}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">운영중</option>
              <option value="INACTIVE">비활성</option>
              <option value="MAINTENANCE">정비중</option>
            </select>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createGame.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createGame.isPending ? '저장 중...' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
