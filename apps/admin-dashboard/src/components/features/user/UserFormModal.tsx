import React, { useState, useEffect } from 'react';
import { useCreateUserMutation, useUpdateUserMutation } from '@/hooks/queries';
import { Modal, Button } from '@/components/ui';
import type { User, UserStatus, UserMembershipTier } from '@/types';

interface UserFormModalProps {
  open: boolean;
  user?: User;
  onClose: () => void;
}

interface FormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  membershipTier: UserMembershipTier;
  status: UserStatus;
}

const initialFormData: FormData = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
  phoneNumber: '',
  membershipTier: 'REGULAR',
  status: 'ACTIVE',
};

export const UserFormModal: React.FC<UserFormModalProps> = ({ open, user, onClose }) => {
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const isEditing = !!user;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        name: user.name || '',
        password: '',
        confirmPassword: '',
        phoneNumber: user.phoneNumber || '',
        membershipTier: user.membershipTier || 'REGULAR',
        status: user.status || 'ACTIVE',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [user, open]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = '비밀번호를 입력해주세요.';
      } else if (formData.password.length < 8) {
        newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    } else if (formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({
          id: user.id,
          data: {
            email: formData.email,
            name: formData.name,
            phoneNumber: formData.phoneNumber || undefined,
            membershipTier: formData.membershipTier,
            status: formData.status,
            ...(formData.password ? { password: formData.password } : {}),
          },
        });
      } else {
        await createUser.mutateAsync({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          phoneNumber: formData.phoneNumber || undefined,
          membershipTier: formData.membershipTier,
          status: formData.status,
        });
      }
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEditing ? '회원 수정' : '회원 추가'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="홍길동"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 {!isEditing && <span className="text-red-500">*</span>}
              {isEditing && <span className="text-gray-500 font-normal">(변경시에만 입력)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="********"
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="********"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="010-1234-5678"
            />
          </div>

          {/* Membership Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회원 등급</label>
            <select
              value={formData.membershipTier}
              onChange={(e) => handleChange('membershipTier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="REGULAR">일반</option>
              <option value="SILVER">실버</option>
              <option value="GOLD">골드</option>
              <option value="PLATINUM">플래티넘</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="SUSPENDED">정지</option>
              <option value="PENDING">대기</option>
            </select>
          </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={isPending}>
            {isEditing ? '수정' : '추가'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
