import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterDeviceDto } from './dto/device.dto';

@ApiTags('Devices')
@Controller('api/user/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: '디바이스 등록/갱신' })
  @ApiResponse({ status: 201, description: '디바이스 등록 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async registerDevice(@Request() req: any, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.registerDevice(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 디바이스 목록 조회' })
  @ApiResponse({ status: 200, description: '디바이스 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getUserDevices(@Request() req: any) {
    return this.devicesService.getUserDevices(req.user.userId);
  }

  @Delete(':deviceToken')
  @ApiOperation({ summary: '디바이스 삭제 (로그아웃 시)' })
  @ApiResponse({ status: 200, description: '디바이스 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async removeDevice(
    @Request() req: any,
    @Param('deviceToken') deviceToken: string,
  ) {
    return this.devicesService.removeDevice(req.user.userId, deviceToken);
  }
}
