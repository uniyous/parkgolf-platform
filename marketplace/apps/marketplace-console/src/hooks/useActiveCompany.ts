/**
 * useActiveCompany stub for marketplace-console.
 * Platform dashboard manages all companies globally,
 * so there's no "active company" context.
 * Returns null to satisfy policy hooks that use useActiveCompanyId().
 */
export function useActiveCompany() {
  return null;
}

export function useActiveCompanyId(): number | null {
  return null;
}
