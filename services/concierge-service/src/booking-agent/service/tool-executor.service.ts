import { Injectable, Logger } from '@nestjs/common';
import { ToolCall } from './deepseek.service';
import { SearchTools } from './tools/search.tools';
import { WeatherTools } from './tools/weather.tools';
import { BookingTools } from './tools/booking.tools';
import { SocialTools } from './tools/social.tools';
import { PaymentTools } from './tools/payment.tools';
import { NotificationTools } from './tools/notification.tools';

/**
 * 도구 실행 결과
 */
export interface ToolResult {
  name: string;
  result: unknown;
  success: boolean;
  error?: string;
}

/**
 * 도구 실행 서비스
 * LLM Function Call → 분리된 *Tools 클래스로 위임
 * 외부 consumer 시그니처 유지를 위한 facade 역할
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    private readonly search: SearchTools,
    private readonly weather: WeatherTools,
    private readonly booking: BookingTools,
    private readonly social: SocialTools,
    private readonly payment: PaymentTools,
    private readonly notification: NotificationTools,
  ) {}

  // ── LLM 도구 디스패치 ──

  async execute(toolCall: ToolCall): Promise<ToolResult> {
    this.logger.debug(`Executing tool: ${toolCall.name}`, toolCall.args);

    try {
      const result = await this.dispatch(toolCall);
      return { name: toolCall.name, result, success: true };
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolCall.name}`, error);
      return {
        name: toolCall.name,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }

  private async dispatch(toolCall: ToolCall): Promise<unknown> {
    switch (toolCall.name) {
      case 'search_clubs':
        return this.search.searchClubs(toolCall.args);
      case 'search_clubs_with_slots':
        return this.search.searchClubsWithSlots(toolCall.args);
      case 'get_club_info':
        return this.search.getClubInfo(toolCall.args);
      case 'search_address':
        return this.search.searchAddress(toolCall.args);
      case 'get_nearby_clubs':
        return this.search.getNearbyClubs(toolCall.args);

      case 'get_weather':
        return this.weather.getWeather(toolCall.args);
      case 'get_weather_by_location':
        return this.weather.getWeatherByLocation(toolCall.args);

      case 'get_available_slots':
        return this.booking.getAvailableSlots(toolCall.args);
      case 'create_booking':
        return this.booking.createBooking(toolCall.args);
      case 'get_booking_policy':
        return this.booking.getBookingPolicy(toolCall.args);

      case 'get_chat_room_members': {
        const roomId = String(toolCall.args.chatRoomId || '');
        if (!roomId) return { error: 'chatRoomId not provided', members: [] };
        const members = await this.social.getChatRoomMembers(roomId);
        return { members: members || [] };
      }

      case 'get_user_recent_bookings': {
        const userId = Number(toolCall.args.userId || 0);
        const limit = Number(toolCall.args.limit || 5);
        if (!userId) return { error: 'userId not provided', bookings: [] };
        const bookings = await this.booking.getUserRecentBookings(userId, limit);
        return { bookings };
      }

      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  // ── 외부 consumer를 위한 facade (시그니처 유지) ──

  resolveRegionName(latitude: number, longitude: number) {
    return this.search.resolveRegionName(latitude, longitude);
  }

  getUserRecentBookings(userId: number, limit = 5) {
    return this.booking.getUserRecentBookings(userId, limit);
  }

  getChatRoomMembers(roomId: string) {
    return this.social.getChatRoomMembers(roomId);
  }

  getBookingBookerId(bookingId: number) {
    return this.booking.getBookingBookerId(bookingId);
  }

  getBookingDetail(bookingId: number) {
    return this.booking.getBookingDetail(bookingId);
  }

  getSettlementStatus(bookingId: number) {
    return this.booking.getSettlementStatus(bookingId);
  }

  preparePayment(params: { bookingId: number; amount: number; orderName: string; userId: number }) {
    return this.payment.preparePayment(params);
  }

  prepareSplitPayment(params: {
    bookingGroupId?: number;
    bookingId: number;
    participants: Array<{ userId: number; userName: string; userEmail: string; amount: number }>;
  }) {
    return this.payment.prepareSplitPayment(params);
  }

  getSplitStatus(bookingId: number) {
    return this.payment.getSplitStatus(bookingId);
  }

  getSplitStatusByOrderId(orderId: string) {
    return this.payment.getSplitStatusByOrderId(orderId);
  }

  emitSplitPaymentNotification(data: {
    bookerId: number;
    bookerName: string;
    bookingGroupId: number;
    chatRoomId: string;
    participants: Array<{ userId: number; userName: string; amount: number }>;
  }) {
    return this.notification.emitSplitPaymentNotification(data);
  }

  broadcastSettlementCard(
    roomId: string,
    targetUserIds: number[],
    settlementData: Record<string, unknown>,
    content?: string,
    bookerUserId?: number,
    senderId?: number,
  ) {
    return this.notification.broadcastSettlementCard(
      roomId,
      targetUserIds,
      settlementData,
      content,
      bookerUserId,
      senderId,
    );
  }

  broadcastTeamCompleteCard(
    roomId: string,
    teamCompleteData: Record<string, unknown>,
    targetUserIds?: number[],
    bookerUserId?: number,
  ) {
    return this.notification.broadcastTeamCompleteCard(
      roomId,
      teamCompleteData,
      targetUserIds,
      bookerUserId,
    );
  }

  sendSystemMessage(roomId: string, content: string) {
    return this.notification.sendSystemMessage(roomId, content);
  }
}
