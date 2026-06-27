import { Controller, Post, Param, Body, Headers, Logger, HttpCode, BadRequestException } from '@nestjs/common';
import { WebhookService } from '../service/webhook.service';

/**
 * 외부 파트너 시스템으로부터 수신하는 웹훅 엔드포인트
 *
 * 경로: POST /webhook/partner/:partnerId
 * 인증: X-Webhook-Signature 헤더로 서명 검증
 */
@Controller('webhook/partner')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post(':partnerId')
  @HttpCode(200)
  async handleWebhook(
    @Param('partnerId') partnerId: string,
    @Headers('x-webhook-signature') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    const id = parseInt(partnerId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid partnerId');
    }

    this.logger.log(`[Webhook] Received from partner ${id}, event=${body.event || 'unknown'}`);

    const result = await this.webhookService.processWebhook(id, signature, body);
    return result;
  }
}
