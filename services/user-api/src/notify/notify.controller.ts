import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotifyService } from './notify.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Post('email')
  async sendEmail(
    @Body() data: {
      to: string;
      subject: string;
      template: string;
      context: any;
    },
  ) {
    return this.notifyService.sendEmail(data);
  }

  @Post('sms')
  async sendSMS(
    @Body() data: {
      to: string;
      message: string;
    },
  ) {
    return this.notifyService.sendSMS(data);
  }
}