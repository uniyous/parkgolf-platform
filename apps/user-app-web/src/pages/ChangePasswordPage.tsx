import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Info,
  Check,
  X,
} from 'lucide-react';
import { AppLayout, Container } from '@/components/layout';
import { GlassCard, Button, clearSkipTimestamp } from '@/components/ui';
import { useChangePasswordMutation } from '@/hooks/queries/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// 비밀번호 강도 타입
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

// 비밀번호 유효성 검사
function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('8자 이상이어야 합니다');
  }
  if (password.length > 128) {
    errors.push('128자 이하여야 합니다');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('영문을 포함해야 합니다');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다');
  }

  return errors;
}

// 비밀번호 강도 계산
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';

  let score = 0;

  // 길이 점수
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // 복잡성 점수
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  if (score <= 6) return 'good';
  return 'strong';
}

const strengthConfig = {
  weak: { level: 1, label: '약함', color: 'var(--color-error)' },
  fair: { level: 2, label: '보통', color: 'var(--color-warning)' },
  good: { level: 3, label: '좋음', color: 'var(--color-info)' },
  strong: { level: 4, label: '강함', color: 'var(--color-success)' },
};

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const changePasswordMutation = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validationErrors = newPassword ? validatePassword(newPassword) : [];
  const passwordStrength = calculatePasswordStrength(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    validationErrors.length === 0 &&
    passwordsMatch;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      // 비밀번호 변경 성공 시 스킵 타임스탬프 제거
      clearSkipTimestamp();
      showSuccessToast('비밀번호가 성공적으로 변경되었습니다.');
      navigate('/profile');
    } catch (error) {
      showErrorToast('비밀번호 변경에 실패했습니다.');
    }
  };

  return (
    <AppLayout title="비밀번호 변경">
      <Container className="py-4 md:py-6 space-y-4">
        {/* 비밀번호 정책 안내 */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-[var(--color-info)]" />
            <h3 className="font-semibold text-white">비밀번호 정책</h3>
          </div>
          <div className="space-y-2">
            <PolicyItem text="8자 이상 128자 이하" />
            <PolicyItem text="영문, 숫자, 특수문자 조합" />
            <PolicyItem text="현재 비밀번호와 다르게 설정" />
          </div>
        </GlassCard>

        {/* 비밀번호 입력 폼 */}
        <GlassCard>
          <div className="space-y-6">
            {/* 현재 비밀번호 */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                현재 비밀번호
              </label>
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="현재 비밀번호 입력"
                showPassword={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              />
            </div>

            <div className="border-t border-[var(--color-border)]" />

            {/* 새 비밀번호 */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                새 비밀번호
              </label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="새 비밀번호 입력"
                showPassword={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
              />

              {/* 강도 표시기 */}
              {newPassword && (
                <div className="mt-3">
                  <PasswordStrengthIndicator strength={passwordStrength} />
                </div>
              )}

              {/* 유효성 에러 */}
              {validationErrors.map((error, index) => (
                <div key={index} className="flex items-center gap-1.5 mt-2 text-[var(--color-error)]">
                  <X className="w-3.5 h-3.5" />
                  <span className="text-sm">{error}</span>
                </div>
              ))}
            </div>

            {/* 새 비밀번호 확인 */}
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                새 비밀번호 확인
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="새 비밀번호 다시 입력"
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {/* 일치 여부 */}
              {confirmPassword && (
                <div className={cn(
                  'flex items-center gap-1.5 mt-2',
                  passwordsMatch ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                )}>
                  {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span className="text-sm">
                    {passwordsMatch ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* 변경 버튼 */}
        <Button
          className="w-full"
          disabled={!canSubmit || changePasswordMutation.isPending}
          onClick={handleSubmit}
        >
          {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </Container>
    </AppLayout>
  );
}

// 정책 항목 컴포넌트
function PolicyItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
      <Check className="w-4 h-4 text-[var(--color-success)]" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// 비밀번호 입력 컴포넌트
function PasswordInput({
  value,
  onChange,
  placeholder,
  showPassword,
  onToggleShow,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-glass pl-10 pr-10"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
}

// 강도 표시기 컴포넌트
function PasswordStrengthIndicator({ strength }: { strength: PasswordStrength }) {
  const config = strengthConfig[strength];

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: level <= config.level ? config.color : 'var(--color-border)',
            }}
          />
        ))}
      </div>
      <span className="text-sm" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}
