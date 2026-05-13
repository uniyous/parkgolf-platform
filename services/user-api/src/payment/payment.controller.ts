import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ForbiddenException,
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
import { AbandonPaymentDto, PreparePaymentDto, ConfirmPaymentDto, ConfirmSplitPaymentDto, PrepareSplitPaymentDto } from './dto/payment.dto';

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

  @Post('split/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '분할결제 승인 (더치페이 개별 결제)' })
  @ApiResponse({ status: 200, description: '분할결제 승인 완료' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  async confirmSplitPayment(
    @CurrentUser('userId') userId: number,
    @Body() dto: ConfirmSplitPaymentDto,
  ) {
    this.logger.log(`Confirming split payment for user ${userId}, orderId: ${dto.orderId}`);
    return this.paymentService.confirmSplitPayment(userId, dto);
  }

  /**
   * 분할결제 준비 — dev 전용 endpoint.
   * production에선 agent-service / 모바일 settlement UI를 통해 트리거되고
   * 본 endpoint는 NODE_ENV=production일 때 403 반환.
   */
  @Post('split/prepare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEV] 분할결제 준비 (참여자별 orderId 발급)' })
  @ApiResponse({ status: 200, description: '분할결제 준비 완료' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 403, description: 'production에선 사용 불가' })
  async prepareSplitPayment(@Body() dto: PrepareSplitPaymentDto) {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new ForbiddenException('dev-only endpoint');
    }
    this.logger.log(`[DEV] Preparing split payment booking=${dto.bookingId}`);
    return this.paymentService.prepareSplitPayment(dto);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'orderId로 결제 상태 조회' })
  @ApiResponse({ status: 200, description: '결제 정보 조회 완료' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    this.logger.log(`Getting payment by orderId: ${orderId}`);
    return this.paymentService.getPaymentByOrderId(orderId);
  }

  @Post(':orderId/abandon')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '결제 중단 통지 (Toss 결제창 실패/취소)' })
  @ApiResponse({ status: 200, description: '결제 중단 처리 완료. PAYMENT_FAILED Saga 트리거' })
  @ApiResponse({ status: 401, description: '인증이 필요합니다.' })
  @ApiResponse({ status: 404, description: '결제 정보를 찾을 수 없습니다.' })
  async abandonPayment(
    @Param('orderId') orderId: string,
    @Body() dto: AbandonPaymentDto,
  ) {
    this.logger.log(`Abandoning payment orderId: ${orderId} reason: ${dto.reason}`);
    return this.paymentService.abandonPayment(orderId, dto);
  }
}
