import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Building,
  Users,
  UserCog,
  UserCheck,
  Shield,
  TrendingUp,
  CalendarCheck,
  MapPin,
  DollarSign,
  Settings,
  Cog,
  Flag,
  Clock,
  CalendarDays,
  ReceiptText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  Building2,
  Building,
  Users,
  UserCog,
  UserCheck,
  Shield,
  TrendingUp,
  CalendarCheck,
  MapPin,
  DollarSign,
  Settings,
  Cog,
  Flag,
  Clock,
  CalendarDays,
  ReceiptText,
};

/**
 * DB에서 전달된 아이콘명을 lucide-react 컴포넌트로 변환
 */
export function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return LayoutDashboard;
  return iconMap[iconName] || LayoutDashboard;
}
