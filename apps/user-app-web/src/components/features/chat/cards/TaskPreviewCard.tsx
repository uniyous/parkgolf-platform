import React from 'react';

interface TaskPreviewData {
  location?: string | null;
  date?: string | null;
  playerCount?: number | null;
  intent?: string;
}

interface TaskPreviewCardProps {
  data: TaskPreviewData;
}

export const TaskPreviewCard: React.FC<TaskPreviewCardProps> = ({ data }) => {
  const tags = [
    data.location && `📍 ${data.location}`,
    data.playerCount && `👥 ${data.playerCount}명`,
    data.date && `📅 ${data.date}`,
  ].filter(Boolean);

  return (
    <div className="mt-2 w-full min-w-[260px] max-w-[320px] bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
      <div className="text-sm text-white/90 mb-2">네! 검색할게요 🏌️</div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
