import { Injectable } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ToolExecutorService } from './tool-executor.service';
import { ChatRequestDto, ConversationContext } from '../dto/chat.dto';

/**
 * 사용자 메시지에서 예약 의도/엔티티(인원/날짜/위치) 추출.
 * 추출 결과는 TASK_PREVIEW 카드 데이터로 사용된다.
 */
@Injectable()
export class MessageContextExtractor {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly toolExecutor: ToolExecutorService,
  ) {}

  /**
   * 사용자 메시지에서 컨텍스트를 추출하여 TASK_PREVIEW 데이터 생성.
   * 예약 의도가 감지되지 않으면 null 반환 (일반 대화에는 프리뷰 불필요).
   * GPS → 지역명 변환을 여기서 수행하면 LlmOrchestrator에서 캐시 히트로 중복 호출 방지.
   */
  async extractContextPreview(
    message: string,
    context: ConversationContext,
    request?: ChatRequestDto,
  ): Promise<Record<string, unknown> | null> {
    const msg = message.toLowerCase();

    const bookingKeywords = ['예약', '부킹', '치자', '치고', '라운딩', '골프장', '파크골프', '검색', '찾아', '추천'];
    const hasBookingIntent = bookingKeywords.some((kw) => msg.includes(kw));
    if (!hasBookingIntent) return null;

    const playerMatch = msg.match(/(\d+)\s*명/);
    const playerCount = playerMatch ? parseInt(playerMatch[1]) : context.slots.playerCount || null;

    let date: string | null = null;
    if (msg.includes('오늘')) date = '오늘';
    else if (msg.includes('내일')) date = '내일';
    else if (msg.includes('모레') || msg.includes('모래')) date = '모레';
    else if (msg.includes('주말')) date = '이번 주말';
    else {
      const dateMatch = msg.match(/(\d{1,2})[\/\-.](\d{1,2})/);
      if (dateMatch) date = `${dateMatch[1]}/${dateMatch[2]}`;
      const dayMatch = msg.match(/(월|화|수|목|금|토|일)요일/);
      if (dayMatch) date = `${dayMatch[1]}요일`;
    }

    const locationMatch = msg.match(/([가-힯]+(?:시|군|구|동|읍|면))/) ||
      msg.match(/([가-힯]{2,})\s*(?:파크골프|골프장)/);
    let location = locationMatch ? locationMatch[1] : (context.slots.regionName || null);

    if (location && !context.slots.regionName) {
      const normalized = await this.toolExecutor.resolveLocationName(location);
      if (normalized) {
        this.conversationService.updateSlots(context, { regionName: normalized });
        location = normalized;
      }
    } else if (!location) {
      const latitude = request?.latitude || context.slots.latitude;
      const longitude = request?.longitude || context.slots.longitude;
      if (latitude && longitude && !context.slots.regionName) {
        const regionName = await this.toolExecutor.resolveRegionName(latitude, longitude);
        if (regionName) {
          this.conversationService.updateSlots(context, { regionName });
          location = regionName;
        }
      } else if (context.slots.regionName) {
        location = context.slots.regionName;
      }
    }

    return {
      location: location || null,
      date: date || '오늘',
      playerCount,
      intent: 'booking',
    };
  }
}
