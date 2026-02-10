import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { PreparePaymentDto, ConfirmPaymentDto } from './dto/payment.dto';

@ApiTags('Payment')
@Controller('api/user/payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('prepare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '결제 준비 (orderId 발급)' })
  @ApiResponse({ status: 200, description: '결제 준비 완료' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async preparePayment(
    @CurrentUser('userId') userId: number,
    @Body() dto: PreparePaymentDto,
  ) {
    this.logger.log(`Preparing payment for user ${userId}`);
    return this.paymentService.preparePayment(userId, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '결제 승인 (토스 API 호출)' })
  @ApiResponse({ status: 200, description: '결제 승인 완료' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async confirmPayment(
    @Body() dto: ConfirmPaymentDto,
  ) {
    this.logger.log(`Confirming payment orderId: ${dto.orderId}`);
    return this.paymentService.confirmPayment(dto);
  }
}
