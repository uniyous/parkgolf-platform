import { useCurrentAdmin } from '@/stores';
import { useSupportStore } from '@/stores/support.store';

export function useActiveCompany() {
  const currentAdmin = useCurrentAdmin();
  const selectedCompany = useSupportStore((s) => s.selectedCompany);

  if (currentAdmin?.primaryScope === 'PLATFORM') {
    return selectedCompany;
  }

  return currentAdmin?.primaryCompany?.company || currentAdmin?.company || null;
}

export function useActiveCompanyId(): number | null {
  const company = useActiveCompany();
  return company?.id ?? null;
}
