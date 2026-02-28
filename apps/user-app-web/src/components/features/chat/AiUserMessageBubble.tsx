import React from 'react';

interface AiUserMessageBubbleProps {
  content: string;
  createdAt: string;
}

export const AiUserMessageBubble: React.FC<AiUserMessageBubbleProps> = ({
  content,
  createdAt,
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="flex items-end gap-1.5 flex-row-reverse">
          <div className="bg-violet-500/15 border-r-[3px] border-r-violet-400 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
            <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <span className="text-[10px] text-white/40 shrink-0">
            {formatTime(createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
