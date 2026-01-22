import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicePlatform } from '@prisma/client';

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

  constructor(private readonly prisma: PrismaService) {}

  // ==============================================
  // 디바이스 등록/갱신
  // ==============================================
  async registerDevice(userId: number, data: RegisterDeviceDto): Promise<DeviceDto> {
    const device = await this.prisma.userDevice.upsert({
      where: {
        userId_deviceToken: {
          userId,
          deviceToken: data.deviceToken,
        },
      },
      create: {
        userId,
        platform: data.platform,
        deviceToken: data.deviceToken,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        isActive: true,
        lastActiveAt: new Date(),
      },
      update: {
        platform: data.platform,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

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
    try {
      await this.prisma.userDevice.delete({
        where: {
          userId_deviceToken: {
            userId,
            deviceToken,
          },
        },
      });
      this.logger.log(`Device removed for user ${userId}`);
      return true;
    } catch {
      this.logger.warn(`Device not found for user ${userId}`);
      return false;
    }
  }

  // ==============================================
  // 디바이스 비활성화 (토큰 만료 등)
  // ==============================================
  async deactivateDevice(deviceToken: string): Promise<boolean> {
    try {
      await this.prisma.userDevice.updateMany({
        where: { deviceToken },
        data: { isActive: false },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==============================================
  // 사용자의 활성 디바이스 목록 조회
  // ==============================================
  async getUserDevices(userId: number): Promise<DeviceDto[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

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
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        platform: true,
        deviceToken: true,
      },
    });

    return devices.map((d) => ({
      platform: d.platform,
      token: d.deviceToken,
    }));
  }

  // ==============================================
  // 마지막 활성 시간 업데이트
  // ==============================================
  async updateLastActive(userId: number, deviceToken: string): Promise<void> {
    await this.prisma.userDevice.updateMany({
      where: {
        userId,
        deviceToken,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }
}
