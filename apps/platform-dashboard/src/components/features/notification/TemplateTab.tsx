import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  useTemplatesQuery,
  useDeleteTemplateMutation,
  useTestTemplateMutation,
} from '@/hooks/queries/notification';
import type { NotificationTemplate } from '@/lib/api/notificationApi';
import { Pagination, DeleteConfirmPopover } from '@/components/common';
import { TemplateFormModal } from './TemplateFormModal';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  PUSH: { label: '푸시', color: 'bg-blue-500/20 text-blue-300' },
  EMAIL: { label: '이메일', color: 'bg-green-500/20 text-green-300' },
  SMS: { label: 'SMS', color: 'bg-orange-500/20 text-orange-300' },
  IN_APP: { label: '인앱', color: 'bg-purple-500/20 text-purple-300' },
};

const formatDateTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const TemplateTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const { data, isLoading } = useTemplatesQuery(page);
  const deleteMutation = useDeleteTemplateMutation();
  const testMutation = useTestTemplateMutation();

  const templates = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleDelete = async (template: NotificationTemplate) => {
    await deleteMutation.mutateAsync(String(template.id));
  };

  const handleTest = (template: NotificationTemplate) => {
    testMutation.mutate({ id: String(template.id), testData: {} });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8">
        <div className="flex items-center justify-center text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mr-3" />
          템플릿을 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/50">
          총 {pagination.total}개 템플릿
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
        >
          + 템플릿 생성
        </button>
      </div>

      {/* 템플릿 목록 */}
      {templates.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-8 text-center text-white/40">
          등록된 템플릿이 없습니다.
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
          <div className="divide-y divide-white/10">
            {templates.map((template) => {
              const typeConfig = TYPE_CONFIG[template.type] || { label: template.type, color: 'bg-gray-500/20 text-gray-300' };
              return (
                <div
                  key={template.id}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white truncate">{template.name}</h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeConfig.color)}>
                          {typeConfig.label}
                        </span>
                        {!template.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                            비활성
                          </span>
                        )}
                      </div>
                      {template.subject && (
                        <div className="text-xs text-white/50 mb-1">제목: {template.subject}</div>
                      )}
                      <div className="text-xs text-white/40 truncate">{template.content}</div>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.variables.map((v) => (
                            <span key={v} className="px-1.5 py-0.5 text-xs bg-white/5 rounded text-white/40">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-white/30 mt-2">
                        수정일: {formatDateTime(template.updatedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleTest(template)}
                        disabled={testMutation.isPending}
                        className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-40"
                      >
                        테스트
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="px-3 py-1.5 text-xs bg-white/10 text-white/70 rounded-md hover:bg-white/20 transition-colors"
                      >
                        수정
                      </button>
                      <DeleteConfirmPopover
                        targetName={template.name}
                        message={`"${template.name}" 템플릿을 삭제하시겠습니까? 해당 템플릿을 사용하는 알림이 영향을 받을 수 있습니다.`}
                        isDeleting={deleteMutation.isPending}
                        onConfirm={() => handleDelete(template)}
                        side="left"
                      >
                        <button
                          className="px-3 py-1.5 text-xs bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </DeleteConfirmPopover>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* 템플릿 생성/수정 모달 */}
      <TemplateFormModal
        isOpen={isFormOpen}
        template={editingTemplate}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(null);
        }}
      />

    </div>
  );
};
