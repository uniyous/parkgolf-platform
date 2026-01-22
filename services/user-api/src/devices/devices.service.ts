import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { RegisterDeviceDto, DeviceResponseDto } from './dto/device.dto';

/**
 * Devices Service for User API
 *
 * NATS Patterns:
 * - users.devices.register: 디바이스 등록
 * - users.devices.remove: 디바이스 삭제
 * - users.devices.list: 디바이스 목록 조회
 */
@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async registerDevice(
    userId: number,
    dto: RegisterDeviceDto,
  ): Promise<ApiResponse<DeviceResponseDto>> {
    this.logger.log(`Register device: userId=${userId}, platform=${dto.platform}`);
    return this.natsClient.send(
      'users.devices.register',
      { userId, ...dto },
      NATS_TIMEOUTS.QUICK,
    );
  }

  async removeDevice(
    userId: number,
    deviceToken: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    this.logger.log(`Remove device: userId=${userId}`);
    return this.natsClient.send(
      'users.devices.remove',
      { userId, deviceToken },
      NATS_TIMEOUTS.QUICK,
    );
  }

  async getUserDevices(userId: number): Promise<ApiResponse<DeviceResponseDto[]>> {
    this.logger.log(`Get devices: userId=${userId}`);
    return this.natsClient.send(
      'users.devices.list',
      { userId },
      NATS_TIMEOUTS.QUICK,
    );
  }
}
