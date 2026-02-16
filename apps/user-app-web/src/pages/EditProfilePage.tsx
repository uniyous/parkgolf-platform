import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail } from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProfileMutation } from '@/hooks/queries/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(formatPhoneDisplay(user?.phone));

  const initialName = user?.name || '';
  const initialPhone = formatPhoneDisplay(user?.phone);

  const hasChanges = name !== initialName || phone !== initialPhone;

  // Validation
  const nameError = name.length > 0 && (name.length < 2 || name.length > 10)
    ? '이름은 2~10자로 입력해주세요'
    : '';

  const phoneError = phone.length > 0 && !/^010-\d{4}-\d{4}$/.test(phone)
    ? '010-XXXX-XXXX 형식으로 입력해주세요'
    : '';

  const canSubmit =
    hasChanges &&
    name.length >= 2 &&
    name.length <= 10 &&
    !nameError &&
    (phone.length === 0 || /^010-\d{4}-\d{4}$/.test(phone)) &&
    !updateProfileMutation.isPending;

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneInput(value));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      await updateProfileMutation.mutateAsync({
        name,
        phone: phone ? phone.replace(/-/g, '') : undefined,
      });
      showSuccessToast('프로필이 수정되었습니다');
      navigate('/profile');
    } catch {
      showErrorToast('프로필 수정에 실패했습니다');
    }
  };

  const avatarInitial = (user?.name || '사용자').charAt(0).toUpperCase();

  return (
    <AppLayout title="프로필 수정">
      <Container className="py-4 md:py-6 space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">{avatarInitial}</span>
          </div>
        </div>

        {/* Form */}
        <GlassCard>
          <div className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-glass opacity-50 cursor-not-allowed"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                이름
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력 (2~10자)"
                  maxLength={10}
                  className="input-glass"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {nameError && (
                <p className="mt-1.5 text-sm text-[var(--color-error)]">{nameError}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                전화번호
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="010-0000-0000"
                  className="input-glass"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
              {phoneError && (
                <p className="mt-1.5 text-sm text-[var(--color-error)]">{phoneError}</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Submit */}
        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {updateProfileMutation.isPending ? '저장 중...' : '저장'}
        </Button>
      </Container>
    </AppLayout>
  );
}
