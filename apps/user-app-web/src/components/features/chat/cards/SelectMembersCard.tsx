import React, { useState } from 'react';
import { Users, Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectMembersData } from '@/lib/api/chatApi';

interface SelectMembersCardProps {
  data: SelectMembersData;
  onConfirm?: (members: Array<{ userId: number; userName: string; userEmail: string }>) => void;
  onCancel?: () => void;
}

export const SelectMembersCard: React.FC<SelectMembersCardProps> = ({
  data,
  onConfirm,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleMember = (userId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else if (next.size < data.maxPlayers) {
        next.add(userId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = data.availableMembers.filter((m) => selectedIds.has(m.userId));
    onConfirm?.(selected);
  };

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-900/20 mt-2 shadow-lg shadow-violet-500/10 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-violet-400 to-purple-500" />
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            팀{data.teamNumber} 멤버 선택
          </h4>
          <p className="text-xs text-white/50 mt-1">
            {data.clubName} · {data.date} · 최대 {data.maxPlayers}명
          </p>
        </div>

        {/* Assigned Teams (read-only) */}
        {data.assignedTeams.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-white/40">이전 팀 배정 현황</p>
            {data.assignedTeams.map((team) => (
              <div
                key={team.teamNumber}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <CheckCircle2 className="w-3 h-3 text-violet-400" />
                  <span className="text-violet-400 font-medium">팀{team.teamNumber}</span>
                  <span>{team.slotTime}</span>
                  <span className="text-white/30">·</span>
                  <span>{team.courseName}</span>
                </div>
                <span className="text-xs text-white/40">
                  {team.members.map((m) => m.userName).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Available Members (checkboxes) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40">참여 가능 멤버</p>
            <span className="text-xs text-violet-400 font-medium">
              {selectedIds.size}/{data.maxPlayers}
            </span>
          </div>
          {data.availableMembers.map((member) => {
            const isSelected = selectedIds.has(member.userId);
            const isDisabled = !isSelected && selectedIds.size >= data.maxPlayers;

            return (
              <button
                key={member.userId}
                onClick={() => toggleMember(member.userId)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isSelected
                    ? 'bg-violet-500/10 border border-violet-500/30'
                    : isDisabled
                      ? 'bg-white/[0.02] border border-white/5 opacity-40 cursor-not-allowed'
                      : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected ? 'bg-violet-500 border-violet-500' : 'border-white/30'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-white/80">{member.userName}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2.5 rounded-lg text-xs text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
              selectedIds.size > 0
                ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            확정 ({selectedIds.size}명)
          </button>
        </div>
      </div>
    </div>
  );
};
