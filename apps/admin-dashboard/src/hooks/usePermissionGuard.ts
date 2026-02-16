import React from 'react';
import { useRolePermission } from './useRolePermission';
import type { Permission } from '../types';

interface WithPermissionProps {
  permission: Permission;
  fallback?: React.ComponentType;
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ComponentType
): React.ComponentType<P> {
  const WithPermissionComponent: React.FC<P> = (props) => {
    const { hasPermission } = useRolePermission();
    
    if (!hasPermission(permission)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return React.createElement(FallbackComponent);
      }
      
      return React.createElement(
        'div',
        { className: 'flex items-center justify-center min-h-[400px]' },
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement('div', { className: 'text-6xl mb-4' }, '🔒'),
          React.createElement('h2', { className: 'text-2xl font-bold text-white mb-2' }, '접근 권한이 없습니다'),
          React.createElement(
            'p',
            { className: 'text-white/60' },
            '이 페이지에 접근하려면 ',
            React.createElement('span', { className: 'font-medium' }, permission),
            ' 권한이 필요합니다.'
          )
        )
      );
    }
    
    return React.createElement(Component, props);
  };
  
  WithPermissionComponent.displayName = `withPermission(${Component.displayName || Component.name})`;
  
  return WithPermissionComponent;
}

// HOC를 사용하는 컴포넌트용 props
export interface PermissionGuardProps extends WithPermissionProps {
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback,
  children
}) => {
  const { hasPermission } = useRolePermission();
  
  if (!hasPermission(permission)) {
    if (fallback) {
      const FallbackComponent = fallback;
      return React.createElement(FallbackComponent);
    }
    
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center min-h-[400px]' },
      React.createElement(
        'div',
        { className: 'text-center' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '🔒'),
        React.createElement('h2', { className: 'text-2xl font-bold text-white mb-2' }, '접근 권한이 없습니다'),
        React.createElement(
          'p',
          { className: 'text-white/60' },
          '이 페이지에 접근하려면 ',
          React.createElement('span', { className: 'font-medium' }, permission),
          ' 권한이 필요합니다.'
        )
      )
    );
  }
  
  return React.createElement(React.Fragment, {}, children);
};