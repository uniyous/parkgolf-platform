// ==============================================
// iam-service / iam_db — Drizzle schema (UNI-81)
// 컬럼명 snake_case(@map). @updatedAt → $defaultFn+$onUpdate. createdAt → defaultNow.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  COMPANY_STATUS_VALUES, COMPANY_TYPE_VALUES, FRIEND_REQUEST_STATUS_VALUES,
  DEVICE_PLATFORM_VALUES, COMPANY_MEMBER_SOURCE_VALUES,
} from '../contracts/enums';

export const companyStatusEnum = pgEnum('CompanyStatus', COMPANY_STATUS_VALUES);
export const companyTypeEnum = pgEnum('CompanyType', COMPANY_TYPE_VALUES);
export const friendRequestStatusEnum = pgEnum('FriendRequestStatus', FRIEND_REQUEST_STATUS_VALUES);
export const devicePlatformEnum = pgEnum('DevicePlatform', DEVICE_PLATFORM_VALUES);
export const companyMemberSourceEnum = pgEnum('CompanyMemberSource', COMPANY_MEMBER_SOURCE_VALUES);

const ts = (name: string) => timestamp(name, { precision: 3 });
const createdAt = () => ts('created_at').notNull().defaultNow();
const updatedAt = () => ts('updated_at').notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date());

// ── Company ──────────────────────────────────
export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    description: text('description'),
    businessNumber: text('business_number'),
    companyType: companyTypeEnum('company_type').notNull().default('FRANCHISE'),
    address: text('address'),
    phoneNumber: text('phone_number'),
    email: text('email'),
    website: text('website'),
    logoUrl: text('logo_url'),
    status: companyStatusEnum('status').notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('companies_code_key').on(t.code),
    uniqueIndex('companies_business_number_key').on(t.businessNumber),
    uniqueIndex('companies_email_key').on(t.email),
    index('companies_code_idx').on(t.code),
    index('companies_company_type_idx').on(t.companyType),
    index('companies_status_idx').on(t.status),
    index('companies_is_active_idx').on(t.isActive),
  ],
);

// ── AdminCompany ─────────────────────────────
export const adminCompanies = pgTable(
  'admin_companies',
  {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').notNull(),
    companyId: integer('company_id').notNull(),
    companyRoleCode: text('company_role_code').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('admin_companies_admin_id_company_id_key').on(t.adminId, t.companyId),
    index('admin_companies_admin_id_idx').on(t.adminId),
    index('admin_companies_company_id_idx').on(t.companyId),
    index('admin_companies_company_role_code_idx').on(t.companyRoleCode),
  ],
);

// ── Admin ────────────────────────────────────
export const admins = pgTable(
  'admins',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    department: text('department'),
    description: text('description'),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: ts('last_login_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('admins_email_key').on(t.email),
    index('admins_is_active_idx').on(t.isActive),
    index('admins_created_at_idx').on(t.createdAt),
  ],
);

export const adminRefreshTokens = pgTable(
  'admin_refresh_tokens',
  {
    id: serial('id').primaryKey(),
    token: text('token').notNull(),
    adminId: integer('admin_id').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('admin_refresh_tokens_token_key').on(t.token)],
);

// ── User ─────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    password: text('password').notNull(),
    passwordChangedAt: ts('password_changed_at'),
    name: text('name'),
    phone: text('phone'),
    profileImageUrl: text('profile_image_url'),
    roleCode: text('role_code').notNull().default('USER'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletionRequestedAt: ts('deletion_requested_at'),
    deletionScheduledAt: ts('deletion_scheduled_at'),
  },
  (t) => [
    uniqueIndex('users_email_key').on(t.email),
    index('users_role_code_idx').on(t.roleCode),
    index('users_is_active_idx').on(t.isActive),
    index('users_name_idx').on(t.name),
    index('users_phone_idx').on(t.phone),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    token: text('token').notNull(),
    userId: integer('user_id').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('refresh_tokens_token_key').on(t.token)],
);

// ── Role & Permission Masters ────────────────
export const roleMasters = pgTable(
  'role_masters',
  {
    code: text('code').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    userType: text('user_type').notNull(),
    scope: text('scope').notNull().default('PLATFORM'),
    level: integer('level').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('role_masters_user_type_idx').on(t.userType),
    index('role_masters_scope_idx').on(t.scope),
    index('role_masters_is_active_idx').on(t.isActive),
  ],
);

export const permissionMasters = pgTable(
  'permission_masters',
  {
    code: text('code').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    level: text('level').notNull().default('low'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('permission_masters_category_idx').on(t.category),
    index('permission_masters_is_active_idx').on(t.isActive),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleCode: text('role_code').notNull(),
    permissionCode: text('permission_code').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.roleCode, t.permissionCode] }),
    index('role_permissions_role_code_idx').on(t.roleCode),
    index('role_permissions_permission_code_idx').on(t.permissionCode),
  ],
);

// ── Activity Logs ────────────────────────────
export const adminActivityLogs = pgTable(
  'admin_activity_logs',
  {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').notNull(),
    companyId: integer('company_id'),
    action: text('action').notNull(),
    resource: text('resource'),
    details: jsonb('details'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [
    index('admin_activity_logs_admin_id_idx').on(t.adminId),
    index('admin_activity_logs_company_id_idx').on(t.companyId),
    index('admin_activity_logs_created_at_idx').on(t.createdAt),
  ],
);

// ── Friend Request ───────────────────────────
export const friendRequests = pgTable(
  'friend_requests',
  {
    id: serial('id').primaryKey(),
    fromUserId: integer('from_user_id').notNull(),
    toUserId: integer('to_user_id').notNull(),
    status: friendRequestStatusEnum('status').notNull().default('PENDING'),
    message: text('message'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('friend_requests_from_user_id_to_user_id_key').on(t.fromUserId, t.toUserId),
    index('friend_requests_from_user_id_idx').on(t.fromUserId),
    index('friend_requests_to_user_id_idx').on(t.toUserId),
    index('friend_requests_status_idx').on(t.status),
  ],
);

// ── Friendship ───────────────────────────────
export const friendships = pgTable(
  'friendships',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    friendId: integer('friend_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('friendships_user_id_friend_id_key').on(t.userId, t.friendId),
    index('friendships_user_id_idx').on(t.userId),
    index('friendships_friend_id_idx').on(t.friendId),
  ],
);

// ── User Notification Setting ────────────────
export const userNotificationSettings = pgTable(
  'user_notification_settings',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    booking: boolean('booking').notNull().default(true),
    chat: boolean('chat').notNull().default(true),
    friend: boolean('friend').notNull().default(true),
    marketing: boolean('marketing').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('user_notification_settings_user_id_key').on(t.userId)],
);

// ── User Device ──────────────────────────────
export const userDevices = pgTable(
  'user_devices',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    deviceToken: text('device_token').notNull(),
    deviceId: text('device_id'),
    deviceName: text('device_name'),
    isActive: boolean('is_active').notNull().default(true),
    lastActiveAt: ts('last_active_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('user_devices_user_id_device_token_key').on(t.userId, t.deviceToken),
    index('user_devices_user_id_idx').on(t.userId),
    index('user_devices_platform_idx').on(t.platform),
    index('user_devices_is_active_idx').on(t.isActive),
  ],
);

// ── Menu System ──────────────────────────────
export const menuMasters = pgTable(
  'menu_masters',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    path: text('path'),
    icon: text('icon'),
    parentId: integer('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    platformOnly: boolean('platform_only').notNull().default(false),
    writePermission: text('write_permission'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('menu_masters_code_key').on(t.code),
    index('menu_masters_parent_id_idx').on(t.parentId),
    index('menu_masters_sort_order_idx').on(t.sortOrder),
    index('menu_masters_is_active_idx').on(t.isActive),
  ],
);

export const menuPermissions = pgTable(
  'menu_permissions',
  {
    menuId: integer('menu_id').notNull(),
    permissionCode: text('permission_code').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.menuId, t.permissionCode] }),
    index('menu_permissions_menu_id_idx').on(t.menuId),
    index('menu_permissions_permission_code_idx').on(t.permissionCode),
  ],
);

export const menuCompanyTypes = pgTable(
  'menu_company_types',
  {
    menuId: integer('menu_id').notNull(),
    companyType: companyTypeEnum('company_type').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.menuId, t.companyType] }),
    index('menu_company_types_menu_id_idx').on(t.menuId),
  ],
);

// ── CompanyMember ────────────────────────────
export const companyMembers = pgTable(
  'company_members',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').notNull(),
    userId: integer('user_id').notNull(),
    source: companyMemberSourceEnum('source').notNull().default('MANUAL'),
    memo: text('memo'),
    isActive: boolean('is_active').notNull().default(true),
    joinedAt: ts('joined_at').notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('company_members_company_id_user_id_key').on(t.companyId, t.userId),
    index('company_members_company_id_idx').on(t.companyId),
    index('company_members_user_id_idx').on(t.userId),
  ],
);

// ── User History ─────────────────────────────
export const userHistories = pgTable(
  'user_histories',
  {
    id: serial('id').primaryKey(),
    originalUserId: integer('original_user_id').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    phone: text('phone'),
    deletionReason: text('deletion_reason'),
    deletedAt: ts('deleted_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('user_histories_original_user_id_key').on(t.originalUserId),
    index('user_histories_original_user_id_idx').on(t.originalUserId),
    index('user_histories_email_idx').on(t.email),
  ],
);

// ── 관계 ─────────────────────────────────────
export const companiesRelations = relations(companies, ({ many }) => ({
  adminCompanies: many(adminCompanies),
  companyMembers: many(companyMembers),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  companies: many(adminCompanies),
  activityLogs: many(adminActivityLogs),
  refreshTokens: many(adminRefreshTokens),
}));

export const adminCompaniesRelations = relations(adminCompanies, ({ one }) => ({
  admin: one(admins, { fields: [adminCompanies.adminId], references: [admins.id] }),
  company: one(companies, { fields: [adminCompanies.companyId], references: [companies.id] }),
  companyRole: one(roleMasters, { fields: [adminCompanies.companyRoleCode], references: [roleMasters.code] }),
}));

export const adminRefreshTokensRelations = relations(adminRefreshTokens, ({ one }) => ({
  admin: one(admins, { fields: [adminRefreshTokens.adminId], references: [admins.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roleMasters, { fields: [users.roleCode], references: [roleMasters.code] }),
  refreshTokens: many(refreshTokens),
  sentFriendRequests: many(friendRequests, { relationName: 'SentRequests' }),
  receivedFriendRequests: many(friendRequests, { relationName: 'ReceivedRequests' }),
  friendsAsUser: many(friendships, { relationName: 'UserFriends' }),
  friendsAsFriend: many(friendships, { relationName: 'FriendOfUser' }),
  notificationSetting: one(userNotificationSettings),
  devices: many(userDevices),
  companyMembers: many(companyMembers),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const roleMastersRelations = relations(roleMasters, ({ many }) => ({
  users: many(users),
  adminCompanies: many(adminCompanies, { relationName: 'CompanyRole' }),
  rolePermissions: many(rolePermissions),
}));

export const permissionMastersRelations = relations(permissionMasters, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  menuPermissions: many(menuPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roleMasters, { fields: [rolePermissions.roleCode], references: [roleMasters.code] }),
  permission: one(permissionMasters, { fields: [rolePermissions.permissionCode], references: [permissionMasters.code] }),
}));

export const adminActivityLogsRelations = relations(adminActivityLogs, ({ one }) => ({
  admin: one(admins, { fields: [adminActivityLogs.adminId], references: [admins.id] }),
}));

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  fromUser: one(users, { relationName: 'SentRequests', fields: [friendRequests.fromUserId], references: [users.id] }),
  toUser: one(users, { relationName: 'ReceivedRequests', fields: [friendRequests.toUserId], references: [users.id] }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, { relationName: 'UserFriends', fields: [friendships.userId], references: [users.id] }),
  friend: one(users, { relationName: 'FriendOfUser', fields: [friendships.friendId], references: [users.id] }),
}));

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  user: one(users, { fields: [userNotificationSettings.userId], references: [users.id] }),
}));

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, { fields: [userDevices.userId], references: [users.id] }),
}));

export const menuMastersRelations = relations(menuMasters, ({ one, many }) => ({
  parent: one(menuMasters, { relationName: 'MenuHierarchy', fields: [menuMasters.parentId], references: [menuMasters.id] }),
  children: many(menuMasters, { relationName: 'MenuHierarchy' }),
  menuPermissions: many(menuPermissions),
  menuCompanyTypes: many(menuCompanyTypes),
}));

export const menuPermissionsRelations = relations(menuPermissions, ({ one }) => ({
  menu: one(menuMasters, { fields: [menuPermissions.menuId], references: [menuMasters.id] }),
  permission: one(permissionMasters, { fields: [menuPermissions.permissionCode], references: [permissionMasters.code] }),
}));

export const menuCompanyTypesRelations = relations(menuCompanyTypes, ({ one }) => ({
  menu: one(menuMasters, { fields: [menuCompanyTypes.menuId], references: [menuMasters.id] }),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, { fields: [companyMembers.companyId], references: [companies.id] }),
  user: one(users, { fields: [companyMembers.userId], references: [users.id] }),
}));

// ── Row 타입 ─────────────────────────────────
export type Company = typeof companies.$inferSelect;
export type AdminCompany = typeof adminCompanies.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type AdminRefreshToken = typeof adminRefreshTokens.$inferSelect;
export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type RoleMaster = typeof roleMasters.$inferSelect;
export type PermissionMaster = typeof permissionMasters.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type UserNotificationSetting = typeof userNotificationSettings.$inferSelect;
export type UserDevice = typeof userDevices.$inferSelect;
export type MenuMaster = typeof menuMasters.$inferSelect;
export type MenuPermission = typeof menuPermissions.$inferSelect;
export type MenuCompanyType = typeof menuCompanyTypes.$inferSelect;
export type CompanyMember = typeof companyMembers.$inferSelect;
export type UserHistory = typeof userHistories.$inferSelect;
