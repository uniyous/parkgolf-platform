import React, { useState, useCallback } from 'react';
import { Users, Clock, GripVertical, X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectParticipantsData, TeamMember } from '@/lib/api/chatApi';

interface SelectParticipantsCardProps {
  data: SelectParticipantsData;
  onConfirm?: (teams: Array<{
    teamNumber: number;
    slotId: string;
    members: TeamMember[];
  }>) => void;
  onCancel?: () => void;
}

export const SelectParticipantsCard: React.FC<SelectParticipantsCardProps> = ({
  data,
  onConfirm,
  onCancel,
}) => {
  const [teams, setTeams] = useState(data.teams);
  const [unassigned, setUnassigned] = useState(data.unassigned);
  const [draggedMember, setDraggedMember] = useState<TeamMember | null>(null);
  const [dragSource, setDragSource] = useState<{ teamNumber: number } | 'unassigned' | null>(null);

  const handleDragStart = useCallback(
    (member: TeamMember, source: { teamNumber: number } | 'unassigned') => {
      setDraggedMember(member);
      setDragSource(source);
    },
    [],
  );

  const handleDrop = useCallback(
    (targetTeamNumber: number | 'unassigned') => {
      if (!draggedMember || !dragSource) return;

      setTeams((prev) => {
        const newTeams = prev.map((t) => ({ ...t, members: [...t.members] }));

        // Remove from source
        if (dragSource !== 'unassigned') {
          const sourceTeam = newTeams.find((t) => t.teamNumber === dragSource.teamNumber);
          if (sourceTeam) {
            sourceTeam.members = sourceTeam.members.filter(
              (m) => m.userId !== draggedMember.userId,
            );
          }
        }

        // Add to target
        if (targetTeamNumber !== 'unassigned') {
          const targetTeam = newTeams.find((t) => t.teamNumber === targetTeamNumber);
          if (targetTeam && targetTeam.members.length < targetTeam.maxPlayers) {
            targetTeam.members.push(draggedMember);
          }
        }

        return newTeams;
      });

      // Update unassigned
      setUnassigned((prev) => {
        let newUnassigned = [...prev];

        if (dragSource === 'unassigned') {
          newUnassigned = newUnassigned.filter((m) => m.userId !== draggedMember.userId);
        }

        if (targetTeamNumber === 'unassigned') {
          newUnassigned.push(draggedMember);
        }

        return newUnassigned;
      });

      setDraggedMember(null);
      setDragSource(null);
    },
    [draggedMember, dragSource],
  );

  const handleRemoveTeam = useCallback((teamNumber: number) => {
    setTeams((prev) => {
      if (prev.length <= 1) return prev; // 최소 1팀
      const team = prev.find((t) => t.teamNumber === teamNumber);
      if (!team) return prev;

      // 팀 멤버를 미배정으로 이동
      setUnassigned((u) => [...u, ...team.members]);
      return prev.filter((t) => t.teamNumber !== teamNumber);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm?.(
      teams.map((t) => ({
        teamNumber: t.teamNumber,
        slotId: t.slotId,
        members: t.members,
      })),
    );
  }, [teams, onConfirm]);

  const totalAssigned = teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 mt-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          팀 편성
        </h4>
        <span className="text-xs text-white/50">
          {totalAssigned}명 배정 · {unassigned.length}명 미배정
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.teamNumber}
            className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(team.teamNumber)}
          >
            {/* Team Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">팀{team.teamNumber}</span>
                <Clock className="w-3 h-3 text-white/40" />
                <span className="text-white/60">{team.slotTime}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/40">{team.courseName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">
                  {team.members.length}/{team.maxPlayers}
                </span>
                {teams.length > 1 && (
                  <button
                    onClick={() => handleRemoveTeam(team.teamNumber)}
                    className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Members */}
            <div className="p-2 space-y-1 min-h-[40px]">
              {team.members.map((member) => (
                <div
                  key={member.userId}
                  draggable
                  onDragStart={() => handleDragStart(member, { teamNumber: team.teamNumber })}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/[0.03] cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-3 h-3 text-white/20" />
                  <span className="text-xs text-white/80">{member.userName}</span>
                </div>
              ))}
              {team.members.length === 0 && (
                <div className="text-center text-xs text-white/20 py-2">
                  멤버를 드래그하여 추가
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div
          className="rounded-lg border border-dashed border-white/10 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('unassigned')}
        >
          <p className="text-xs text-white/40 mb-2">미배정 ({unassigned.length}명)</p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((member) => (
              <div
                key={member.userId}
                draggable
                onDragStart={() => handleDragStart(member, 'unassigned')}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3 h-3 text-white/20" />
                <span className="text-xs text-white/60">{member.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-white/10 pt-3 flex justify-between items-center text-xs">
        <span className="text-white/50">
          1인당 {data.pricePerPerson.toLocaleString()}원
        </span>
        <span className="text-emerald-400 font-semibold">
          총 {(totalAssigned * data.pricePerPerson).toLocaleString()}원
        </span>
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
          disabled={totalAssigned === 0}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
            totalAssigned > 0
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          <Check className="w-3.5 h-3.5" />
          확정 ({totalAssigned}명)
        </button>
      </div>
    </div>
  );
};
