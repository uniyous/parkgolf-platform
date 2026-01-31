import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface SubPageHeaderProps {
  title: string;
  /** Back handler. Pass false to hide the back button. Defaults to navigate(-1). */
  onBack?: (() => void) | false;
  rightContent?: ReactNode;
}

export function SubPageHeader({ title, onBack, rightContent }: SubPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="sticky top-0 z-30 glass-card !rounded-none md:!rounded-b-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack !== false && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}

        <h2 className="flex-1 text-white font-semibold truncate">{title}</h2>

        {rightContent && (
          <div className="flex items-center gap-2">{rightContent}</div>
        )}
      </div>
    </div>
  );
}
