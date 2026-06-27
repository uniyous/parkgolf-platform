// ==============================================
// iam-service 도메인 enum 단일 소스 (UNI-81 Drizzle 전환)
// ==============================================

export const CompanyStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', SUSPENDED: 'SUSPENDED', PENDING: 'PENDING' } as const;
export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const CompanyType = { PLATFORM: 'PLATFORM', ASSOCIATION: 'ASSOCIATION', FRANCHISE: 'FRANCHISE' } as const;
export type CompanyType = (typeof CompanyType)[keyof typeof CompanyType];

export const FriendRequestStatus = { PENDING: 'PENDING', ACCEPTED: 'ACCEPTED', REJECTED: 'REJECTED' } as const;
export type FriendRequestStatus = (typeof FriendRequestStatus)[keyof typeof FriendRequestStatus];

export const DevicePlatform = { IOS: 'IOS', ANDROID: 'ANDROID', WEB: 'WEB' } as const;
export type DevicePlatform = (typeof DevicePlatform)[keyof typeof DevicePlatform];

export const CompanyMemberSource = { BOOKING: 'BOOKING', MANUAL: 'MANUAL', WALK_IN: 'WALK_IN' } as const;
export type CompanyMemberSource = (typeof CompanyMemberSource)[keyof typeof CompanyMemberSource];

const vals = <T extends Record<string, string>>(o: T) => Object.values(o) as [T[keyof T], ...T[keyof T][]];
export const COMPANY_STATUS_VALUES = vals(CompanyStatus);
export const COMPANY_TYPE_VALUES = vals(CompanyType);
export const FRIEND_REQUEST_STATUS_VALUES = vals(FriendRequestStatus);
export const DEVICE_PLATFORM_VALUES = vals(DevicePlatform);
export const COMPANY_MEMBER_SOURCE_VALUES = vals(CompanyMemberSource);

// jsonb 값 타입
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
