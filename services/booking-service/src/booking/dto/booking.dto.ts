import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { Booking, BookingStatus, Payment, BookingHistory } from '@prisma/client';

/** Booking 엔티티 타입 (관계 포함) */
export type BookingWithRelations = Booking & {
  payments?: Payment[];
  histories?: BookingHistory[];
};

export class CreateBookingRequestDto {
  @ApiProperty({ description: '멱등성 키 (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ description: '사용자 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ description: 'GameTimeSlot ID (course-service)', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  gameTimeSlotId: number;

  @ApiProperty({ description: '플레이어 수', example: 2 })
  @IsNumber()
  playerCount: number;

  @ApiProperty({ description: '결제 방법', example: 'card' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: '특별 요청사항', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: '사용자 이메일', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({ description: '사용자 이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: '사용자 전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  userPhone?: string;
}

export class UpdateBookingDto {
  @ApiProperty({ description: '플레이어 수', example: 3 })
  @IsNumber()
  @IsOptional()
  playerCount?: number;

  @ApiProperty({ description: '특별 요청사항', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiProperty({ description: '사용자 전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  userPhone?: string;
}

export class SearchBookingDto {
  @ApiProperty({ description: '페이지 번호', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 10, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: '예약 상태', example: 'CONFIRMED', required: false })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiProperty({ description: 'Game ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  gameId?: number;

  @ApiProperty({ description: 'Club ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  clubId?: number;

  @ApiProperty({ description: '사용자 ID', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({ description: '시작 날짜', example: '2024-07-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: '종료 날짜', example: '2024-07-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: '정렬 기준', example: 'bookingDate', required: false })
  @IsString()
  @IsOptional()
  sortBy?: 'bookingDate' | 'createdAt' | 'totalPrice';

  @ApiProperty({ description: '정렬 순서', example: 'desc', required: false })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ description: '시간 필터', example: 'upcoming', required: false })
  @IsString()
  @IsOptional()
  timeFilter?: 'upcoming' | 'past' | 'all';
}

export class GameTimeSlotAvailabilityDto {
  @ApiProperty({ description: 'ID' })
  id: number;

  @ApiProperty({ description: 'GameTimeSlot ID' })
  gameTimeSlotId: number;

  @ApiProperty({ description: 'Game ID' })
  gameId: number;

  @ApiProperty({ description: '게임명' })
  gameName: string;

  @ApiProperty({ description: '게임 코드' })
  gameCode: string;

  @ApiProperty({ description: '전반 9홀 코스명' })
  frontNineCourseName: string;

  @ApiProperty({ description: '후반 9홀 코스명' })
  backNineCourseName: string;

  @ApiProperty({ description: '클럽 ID' })
  clubId: number;

  @ApiProperty({ description: '클럽명' })
  clubName: string;

  @ApiProperty({ description: '날짜', example: '2024-07-15' })
  date: string;

  @ApiProperty({ description: '시작 시간', example: '09:00' })
  startTime: string;

  @ApiProperty({ description: '종료 시간', example: '12:00' })
  endTime: string;

  @ApiProperty({ description: '최대 인원' })
  maxPlayers: number;

  @ApiProperty({ description: '예약된 인원' })
  bookedPlayers: number;

  @ApiProperty({ description: '가용 인원' })
  availablePlayers: number;

  @ApiProperty({ description: '예약 가능 여부' })
  isAvailable: boolean;

  @ApiProperty({ description: '가격' })
  price: number;

  @ApiProperty({ description: '프리미엄 시간대 여부' })
  isPremium: boolean;

  @ApiProperty({ description: '상태' })
  status: string;
}

export class BookingResponseDto {
  @ApiProperty({ description: '예약 ID' })
  id: number;

  @ApiProperty({ description: '예약번호 (BK-XXXXXXXX-XXXX 형식)' })
  bookingNumber: string;

  @ApiProperty({ description: '사용자 ID (회원 예약 시)' })
  userId?: number;

  @ApiProperty({ description: '게임 ID' })
  gameId: number;

  @ApiProperty({ description: '게임 타임슬롯 ID' })
  gameTimeSlotId: number;

  @ApiProperty({ description: '게임명 (예: A+B 코스)' })
  gameName?: string;

  @ApiProperty({ description: '게임 코드' })
  gameCode?: string;

  @ApiProperty({ description: '전반 9홀 코스 ID' })
  frontNineCourseId?: number;

  @ApiProperty({ description: '전반 9홀 코스명' })
  frontNineCourseName?: string;

  @ApiProperty({ description: '후반 9홀 코스 ID' })
  backNineCourseId?: number;

  @ApiProperty({ description: '후반 9홀 코스명' })
  backNineCourseName?: string;

  @ApiProperty({ description: '클럽 ID' })
  clubId?: number;

  @ApiProperty({ description: '클럽명' })
  clubName?: string;

  @ApiProperty({ description: '예약 날짜 (YYYY-MM-DD)' })
  bookingDate: string;

  @ApiProperty({ description: '시작 시간 (HH:MM)' })
  startTime: string;

  @ApiProperty({ description: '종료 시간 (HH:MM)' })
  endTime: string;

  @ApiProperty({ description: '플레이어 수' })
  playerCount: number;

  @ApiProperty({ description: '1인당 가격' })
  pricePerPerson: number;

  @ApiProperty({ description: '서비스 수수료' })
  serviceFee: number;

  @ApiProperty({ description: '총 결제 금액' })
  totalPrice: number;

  @ApiProperty({ description: '예약 상태', enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ description: '결제 방법' })
  paymentMethod?: string;

  @ApiProperty({ description: '특별 요청사항' })
  specialRequests?: string;

  @ApiProperty({ description: '관리자 메모' })
  notes?: string;

  // 회원 예약자 정보
  @ApiProperty({ description: '회원 이메일' })
  userEmail?: string;

  @ApiProperty({ description: '회원 이름' })
  userName?: string;

  @ApiProperty({ description: '회원 전화번호' })
  userPhone?: string;

  // 비회원 예약자 정보
  @ApiProperty({ description: '비회원 예약자명' })
  guestName?: string;

  @ApiProperty({ description: '비회원 이메일' })
  guestEmail?: string;

  @ApiProperty({ description: '비회원 전화번호' })
  guestPhone?: string;

  // Saga 관련
  @ApiProperty({ description: '멱등성 키' })
  idempotencyKey?: string;

  @ApiProperty({ description: 'Saga 실패 사유 (status가 FAILED일 때)' })
  sagaFailReason?: string;

  @ApiProperty({ description: '결제 목록' })
  payments: any[];

  @ApiProperty({ description: '예약 히스토리' })
  histories: any[];

  @ApiProperty({ description: '예약 취소 가능 여부' })
  canCancel?: boolean;

  @ApiProperty({ description: '생성일시' })
  createdAt: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt: string;

  /**
   * 엔티티를 DTO로 변환
   */
  static fromEntity(entity: BookingWithRelations, includeCanCancel: boolean = false): BookingResponseDto {
    const dto = new BookingResponseDto();
    dto.id = entity.id;
    dto.bookingNumber = entity.bookingNumber;
    dto.userId = entity.userId ?? undefined;
    dto.gameId = entity.gameId;
    dto.gameTimeSlotId = entity.gameTimeSlotId;
    dto.gameName = entity.gameName ?? undefined;
    dto.gameCode = entity.gameCode ?? undefined;
    dto.frontNineCourseId = entity.frontNineCourseId ?? undefined;
    dto.frontNineCourseName = entity.frontNineCourseName ?? undefined;
    dto.backNineCourseId = entity.backNineCourseId ?? undefined;
    dto.backNineCourseName = entity.backNineCourseName ?? undefined;
    dto.clubId = entity.clubId ?? undefined;
    dto.clubName = entity.clubName ?? undefined;
    dto.bookingDate = entity.bookingDate.toISOString().split('T')[0];
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.playerCount = entity.playerCount;
    dto.pricePerPerson = Number(entity.pricePerPerson);
    dto.serviceFee = Number(entity.serviceFee);
    dto.totalPrice = Number(entity.totalPrice);
    dto.status = entity.status;
    dto.paymentMethod = entity.paymentMethod ?? undefined;
    dto.specialRequests = entity.specialRequests ?? undefined;
    dto.notes = entity.notes ?? undefined;
    // 회원 예약자 정보
    dto.userEmail = entity.userEmail ?? undefined;
    dto.userName = entity.userName ?? undefined;
    dto.userPhone = entity.userPhone ?? undefined;
    // 비회원 예약자 정보
    dto.guestName = entity.guestName ?? undefined;
    dto.guestEmail = entity.guestEmail ?? undefined;
    dto.guestPhone = entity.guestPhone ?? undefined;
    // Saga 관련
    dto.idempotencyKey = entity.idempotencyKey ?? undefined;
    dto.sagaFailReason = entity.sagaFailReason ?? undefined;
    // 관계 데이터
    dto.payments = entity.payments || [];
    dto.histories = entity.histories || [];
    // 타임스탬프
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();

    // 취소 가능 여부 계산 (요청 시)
    if (includeCanCancel) {
      dto.canCancel = BookingResponseDto.calculateCanCancel(entity.bookingDate, entity.status);
    }

    return dto;
  }

  /**
   * 엔티티 배열을 DTO 배열로 변환
   */
  static fromEntities(entities: BookingWithRelations[], includeCanCancel: boolean = false): BookingResponseDto[] {
    return entities.map(entity => BookingResponseDto.fromEntity(entity, includeCanCancel));
  }

  /**
   * 예약 취소 가능 여부 계산
   * - 취소/완료 상태는 취소 불가
   * - 예약일 3일 전까지만 취소 가능
   */
  private static calculateCanCancel(bookingDate: Date, status: BookingStatus): boolean {
    if (status === BookingStatus.CANCELLED || status === BookingStatus.COMPLETED) {
      return false;
    }

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    return new Date(bookingDate) >= threeDaysFromNow;
  }
}

// NATS 이벤트 페이로드
export interface BookingConfirmedEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameName: string;
  frontNineCourseName: string;
  backNineCourseName: string;
  bookingDate: string;
  timeSlot: string;
  playerCount: number;
  totalPrice: number;
  userEmail: string;
  userName: string;
}

export interface BookingCancelledEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameName: string;
  bookingDate: string;
  timeSlot: string;
  reason: string;
  cancelledAt: string;
  userEmail: string;
  userName: string;
}

// =====================================================
// Saga 이벤트 페이로드
// =====================================================

// booking-service → course-service: 슬롯 예약 요청
export interface SlotReserveRequest {
  bookingId: number;
  bookingNumber: string;
  gameTimeSlotId: number;
  playerCount: number;
  requestedAt: string;
}

// course-service → booking-service: 슬롯 예약 성공
export interface SlotReservedEvent {
  bookingId: number;
  gameTimeSlotId: number;
  playerCount: number;
  reservedAt: string;
}

// course-service → booking-service: 슬롯 예약 실패
export interface SlotReserveFailedEvent {
  bookingId: number;
  gameTimeSlotId: number;
  reason: string;
  failedAt: string;
}

// booking-service → course-service: 슬롯 해제 요청
export interface SlotReleaseRequest {
  bookingId: number;
  gameTimeSlotId: number;
  playerCount: number;
  reason: string;
  requestedAt: string;
}
