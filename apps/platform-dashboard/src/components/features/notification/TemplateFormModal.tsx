import React, { useState, useEffect } from 'react';
import {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from '@/hooks/queries/notification';
import type { NotificationTemplate } from '@/lib/api/notificationApi';
import { Modal } from '@/components/ui';

interface TemplateFormModalProps {
  isOpen: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PUSH', label: '푸시' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'SMS', label: 'SMS' },
  { value: 'IN_APP', label: '인앱' },
];

export const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  isOpen,
  template,
  onClose,
}) => {
  const isEdit = !!template;

  const [name, setName] = useState('');
  const [type, setType] = useState('PUSH');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState('');
  const [isActive, setIsActive] = useState(true);

  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();

  useEffect(() => {
    if (!isOpen) return;
    if (template) {
      setName(template.name || '');
      setType(template.type || 'PUSH');
      setSubject(template.subject || '');
      setContent(template.content || '');
      // variables는 Json? 타입이므로 다양한 형태로 올 수 있음
      const vars = template.variables;
      if (Array.isArray(vars)) {
        setVariables(vars.join(', '));
      } else if (typeof vars === 'string') {
        try { setVariables(JSON.parse(vars).join(', ')); } catch { setVariables(vars); }
      } else {
        setVariables('');
      }
      setIsActive(template.isActive ?? true);
    } else {
      setName('');
      setType('PUSH');
      setSubject('');
      setContent('');
      setVariables('');
      setIsActive(true);
    }
  }, [template, isOpen]);

  const handleSubmit = () => {
    if (!name.trim() || !content.trim()) return;

    const variablesArray = variables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (isEdit && template) {
      updateMutation.mutate(
        {
          id: String(template.id),
          data: {
            name: name.trim(),
            subject: subject.trim() || undefined,
            content: content.trim(),
            variables: variablesArray,
            isActive,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        {
          name: name.trim(),
          type: type as 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP',
          subject: subject.trim() || undefined,
          content: content.trim(),
          variables: variablesArray.length > 0 ? variablesArray : undefined,
          isActive,
        },
        { onSuccess: onClose },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '템플릿 수정' : '템플릿 생성'}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">
            템플릿명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 예약 확인 알림"
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-sm text-white/60 mb-1">유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-800">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === 'EMAIL' || template?.type === 'EMAIL') && (
          <div>
            <label className="block text-sm text-white/60 mb-1">이메일 제목</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목"
              className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1">
            내용 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="알림 내용을 입력하세요. 변수는 {{변수명}} 형식으로 사용합니다."
            rows={5}
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">변수 (쉼표 구분)</label>
          <input
            type="text"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            placeholder="예: userName, bookingDate, clubName"
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
          />
          <label htmlFor="isActive" className="text-sm text-white/60">활성화</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !content.trim() || isPending}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '처리 중...' : isEdit ? '수정' : '생성'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
