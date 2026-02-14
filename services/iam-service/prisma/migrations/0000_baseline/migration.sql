-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('PLATFORM', 'ASSOCIATION', 'FRANCHISE');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_companies" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "company_role_code" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "description" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "business_number" TEXT,
    "company_type" "CompanyType" NOT NULL DEFAULT 'FRANCHISE',
    "address" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_requests" (
    "id" SERIAL NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_company_types" (
    "menu_id" INTEGER NOT NULL,
    "company_type" "CompanyType" NOT NULL,

    CONSTRAINT "menu_company_types_pkey" PRIMARY KEY ("menu_id","company_type")
);

-- CreateTable
CREATE TABLE "menu_masters" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "icon" TEXT,
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "platform_only" BOOLEAN NOT NULL DEFAULT false,
    "write_permission" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_permissions" (
    "menu_id" INTEGER NOT NULL,
    "permission_code" TEXT NOT NULL,

    CONSTRAINT "menu_permissions_pkey" PRIMARY KEY ("menu_id","permission_code")
);

-- CreateTable
CREATE TABLE "permission_masters" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'low',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_masters_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_masters" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_type" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'PLATFORM',
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_masters_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_code" TEXT NOT NULL,
    "permission_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_code","permission_code")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "device_token" TEXT NOT NULL,
    "device_id" TEXT,
    "device_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "booking" BOOLEAN NOT NULL DEFAULT true,
    "chat" BOOLEAN NOT NULL DEFAULT true,
    "friend" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role_code" TEXT NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "profile_image_url" TEXT,
    "password_changed_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_activity_logs_admin_id_idx" ON "admin_activity_logs"("admin_id" ASC);

-- CreateIndex
CREATE INDEX "admin_activity_logs_company_id_idx" ON "admin_activity_logs"("company_id" ASC);

-- CreateIndex
CREATE INDEX "admin_activity_logs_created_at_idx" ON "admin_activity_logs"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_companies_admin_id_company_id_key" ON "admin_companies"("admin_id" ASC, "company_id" ASC);

-- CreateIndex
CREATE INDEX "admin_companies_admin_id_idx" ON "admin_companies"("admin_id" ASC);

-- CreateIndex
CREATE INDEX "admin_companies_company_id_idx" ON "admin_companies"("company_id" ASC);

-- CreateIndex
CREATE INDEX "admin_companies_company_role_code_idx" ON "admin_companies"("company_role_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_key" ON "admin_refresh_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "admins_created_at_idx" ON "admins"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email" ASC);

-- CreateIndex
CREATE INDEX "admins_is_active_idx" ON "admins"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "companies_business_number_key" ON "companies"("business_number" ASC);

-- CreateIndex
CREATE INDEX "companies_code_idx" ON "companies"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code" ASC);

-- CreateIndex
CREATE INDEX "companies_company_type_idx" ON "companies"("company_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email" ASC);

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active" ASC);

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status" ASC);

-- CreateIndex
CREATE INDEX "friend_requests_from_user_id_idx" ON "friend_requests"("from_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "friend_requests_from_user_id_to_user_id_key" ON "friend_requests"("from_user_id" ASC, "to_user_id" ASC);

-- CreateIndex
CREATE INDEX "friend_requests_status_idx" ON "friend_requests"("status" ASC);

-- CreateIndex
CREATE INDEX "friend_requests_to_user_id_idx" ON "friend_requests"("to_user_id" ASC);

-- CreateIndex
CREATE INDEX "friendships_friend_id_idx" ON "friendships"("friend_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "friendships_user_id_friend_id_key" ON "friendships"("user_id" ASC, "friend_id" ASC);

-- CreateIndex
CREATE INDEX "friendships_user_id_idx" ON "friendships"("user_id" ASC);

-- CreateIndex
CREATE INDEX "menu_company_types_menu_id_idx" ON "menu_company_types"("menu_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "menu_masters_code_key" ON "menu_masters"("code" ASC);

-- CreateIndex
CREATE INDEX "menu_masters_is_active_idx" ON "menu_masters"("is_active" ASC);

-- CreateIndex
CREATE INDEX "menu_masters_parent_id_idx" ON "menu_masters"("parent_id" ASC);

-- CreateIndex
CREATE INDEX "menu_masters_sort_order_idx" ON "menu_masters"("sort_order" ASC);

-- CreateIndex
CREATE INDEX "menu_permissions_menu_id_idx" ON "menu_permissions"("menu_id" ASC);

-- CreateIndex
CREATE INDEX "menu_permissions_permission_code_idx" ON "menu_permissions"("permission_code" ASC);

-- CreateIndex
CREATE INDEX "permission_masters_category_idx" ON "permission_masters"("category" ASC);

-- CreateIndex
CREATE INDEX "permission_masters_is_active_idx" ON "permission_masters"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "role_masters_is_active_idx" ON "role_masters"("is_active" ASC);

-- CreateIndex
CREATE INDEX "role_masters_scope_idx" ON "role_masters"("scope" ASC);

-- CreateIndex
CREATE INDEX "role_masters_user_type_idx" ON "role_masters"("user_type" ASC);

-- CreateIndex
CREATE INDEX "role_permissions_permission_code_idx" ON "role_permissions"("permission_code" ASC);

-- CreateIndex
CREATE INDEX "role_permissions_role_code_idx" ON "role_permissions"("role_code" ASC);

-- CreateIndex
CREATE INDEX "user_devices_is_active_idx" ON "user_devices"("is_active" ASC);

-- CreateIndex
CREATE INDEX "user_devices_platform_idx" ON "user_devices"("platform" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_token_key" ON "user_devices"("user_id" ASC, "device_token" ASC);

-- CreateIndex
CREATE INDEX "user_devices_user_id_idx" ON "user_devices"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_user_id_key" ON "user_notification_settings"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active" ASC);

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name" ASC);

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone" ASC);

-- CreateIndex
CREATE INDEX "users_role_code_idx" ON "users"("role_code" ASC);

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_companies" ADD CONSTRAINT "admin_companies_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_companies" ADD CONSTRAINT "admin_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_companies" ADD CONSTRAINT "admin_companies_company_role_code_fkey" FOREIGN KEY ("company_role_code") REFERENCES "role_masters"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_company_types" ADD CONSTRAINT "menu_company_types_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_masters" ADD CONSTRAINT "menu_masters_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu_masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permission_masters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permission_masters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "role_masters"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "role_masters"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

