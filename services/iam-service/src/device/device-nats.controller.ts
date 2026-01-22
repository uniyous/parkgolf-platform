import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeviceService, RegisterDeviceDto } from './device.service';
import { NatsResponse } from '../common/types/response.types';

@Controller()
export class DeviceNatsController {
  private readonly logger = new Logger(DeviceNatsController.name);

  constructor(private readonly deviceService: DeviceService) {}

  // ==============================================
  // 디바이스 등록
  // ==============================================
  @MessagePattern('users.devices.register')
  async registerDevice(@Payload() data: { userId: number } & RegisterDeviceDto) {
    this.logger.debug(`Registering device for user: ${data.userId}, platform: ${data.platform}`);
    const device = await this.deviceService.registerDevice(data.userId, {
      platform: data.platform,
      deviceToken: data.deviceToken,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
    });
    return NatsResponse.success(device);
  }

  // ==============================================
  // 디바이스 삭제
  // ==============================================
  @MessagePattern('users.devices.remove')
  async removeDevice(@Payload() data: { userId: number; deviceToken: string }) {
    this.logger.debug(`Removing device for user: ${data.userId}`);
    const result = await this.deviceService.removeDevice(data.userId, data.deviceToken);
    return NatsResponse.success({ removed: result });
  }

  // ==============================================
  // 디바이스 목록 조회
  // ==============================================
  @MessagePattern('users.devices.list')
  async getUserDevices(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting devices for user: ${data.userId}`);
    const devices = await this.deviceService.getUserDevices(data.userId);
    return NatsResponse.success(devices);
  }

  // ==============================================
  // 활성 디바이스 토큰 조회 (notify-service용)
  // ==============================================
  @MessagePattern('users.devices.tokens')
  async getActiveDeviceTokens(@Payload() data: { userId: number }) {
    this.logger.debug(`Getting device tokens for user: ${data.userId}`);
    const tokens = await this.deviceService.getActiveDeviceTokens(data.userId);
    return NatsResponse.success(tokens);
  }

  // ==============================================
  // 마지막 활성 시간 업데이트
  // ==============================================
  @MessagePattern('users.devices.heartbeat')
  async updateLastActive(@Payload() data: { userId: number; deviceToken: string }) {
    await this.deviceService.updateLastActive(data.userId, data.deviceToken);
    return NatsResponse.success({ updated: true });
  }
}
