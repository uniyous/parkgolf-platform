import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useBreadcrumb } from '@/stores';

export const BreadcrumbContainer: React.FC = () => {
  const { items } = useBreadcrumb();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <ChevronRight className="w-6 h-6 text-white/40 mx-1" />
            )}
            {item.path && index < items.length - 1 ? (
              <Link
                to={item.path}
                className="inline-flex items-center text-sm font-medium text-white/70 hover:text-emerald-400"
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </Link>
            ) : (
              <span className="inline-flex items-center text-sm font-medium text-white/50">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
