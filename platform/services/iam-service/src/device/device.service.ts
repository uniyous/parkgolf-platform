import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { userDevices } from '../db/schema';
import { DevicePlatform } from '../contracts/enums';

export interface RegisterDeviceDto {
  platform: DevicePlatform;
  deviceToken: string;
  deviceId?: string;
  deviceName?: string;
}

export interface DeviceDto {
  id: number;
  platform: DevicePlatform;
  deviceId: string | null;
  deviceName: string | null;
  isActive: boolean;
  lastActiveAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  // ==============================================
  // 디바이스 등록/갱신
  // ==============================================
  async registerDevice(userId: number, data: RegisterDeviceDto): Promise<DeviceDto> {
    const [device] = await this.db
      .insert(userDevices)
      .values({
        userId,
        platform: data.platform,
        deviceToken: data.deviceToken,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        isActive: true,
        lastActiveAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userDevices.userId, userDevices.deviceToken],
        set: {
          platform: data.platform,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          isActive: true,
          lastActiveAt: new Date(),
        },
      })
      .returning();

    this.logger.log(`Device registered for user ${userId}: ${data.platform}`);

    return {
      id: device.id,
      platform: device.platform,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      isActive: device.isActive,
      lastActiveAt: device.lastActiveAt,
      createdAt: device.createdAt,
    };
  }

  // ==============================================
  // 디바이스 삭제 (로그아웃 시)
  // ==============================================
  async removeDevice(userId: number, deviceToken: string): Promise<boolean> {
    const deleted = await this.db
      .delete(userDevices)
      .where(and(eq(userDevices.userId, userId), eq(userDevices.deviceToken, deviceToken)))
      .returning();
    if (deleted.length > 0) {
      this.logger.log(`Device removed for user ${userId}`);
      return true;
    }
    this.logger.warn(`Device not found for user ${userId}`);
    return false;
  }

  // ==============================================
  // 디바이스 비활성화 (토큰 만료 등)
  // ==============================================
  async deactivateDevice(deviceToken: string): Promise<boolean> {
    try {
      await this.db
        .update(userDevices)
        .set({ isActive: false })
        .where(eq(userDevices.deviceToken, deviceToken));
      return true;
    } catch {
      return false;
    }
  }

  // ==============================================
  // 사용자의 활성 디바이스 목록 조회
  // ==============================================
  async getUserDevices(userId: number): Promise<DeviceDto[]> {
    const devices = await this.db
      .select()
      .from(userDevices)
      .where(and(eq(userDevices.userId, userId), eq(userDevices.isActive, true)))
      .orderBy(desc(userDevices.lastActiveAt));

    return devices.map((device) => ({
      id: device.id,
      platform: device.platform,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      isActive: device.isActive,
      lastActiveAt: device.lastActiveAt,
      createdAt: device.createdAt,
    }));
  }

  // ==============================================
  // 사용자의 모든 디바이스 토큰 조회 (알림 발송용)
  // ==============================================
  async getActiveDeviceTokens(userId: number): Promise<{ platform: DevicePlatform; token: string }[]> {
    const devices = await this.db
      .select({ platform: userDevices.platform, deviceToken: userDevices.deviceToken })
      .from(userDevices)
      .where(and(eq(userDevices.userId, userId), eq(userDevices.isActive, true)));

    return devices.map((d) => ({
      platform: d.platform,
      token: d.deviceToken,
    }));
  }

  // ==============================================
  // 마지막 활성 시간 업데이트
  // ==============================================
  async updateLastActive(userId: number, deviceToken: string): Promise<void> {
    await this.db
      .update(userDevices)
      .set({ lastActiveAt: new Date() })
      .where(and(eq(userDevices.userId, userId), eq(userDevices.deviceToken, deviceToken)));
  }
}
