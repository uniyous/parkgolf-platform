// ==============================================
// chat-service 도메인 enum 단일 소스 (UNI-83)
// const 객체 + 파생 타입 → 값 접근(RoomType.DIRECT)·타입 둘 다 제공.
// Drizzle pgEnum·DTO·NATS 계약이 모두 여기서 파생 (단일 진실원천).
// ==============================================

export const RoomType = {
  DIRECT: 'DIRECT', // 1:1 채팅
  CHANNEL: 'CHANNEL', // 그룹 채팅
  BOOKING: 'BOOKING', // 예약 관련 채팅방
} as const;
export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  SYSTEM: 'SYSTEM', // 입장/퇴장 등 시스템 메시지
  AI_USER: 'AI_USER', // AI 모드 사용자 메시지
  AI_ASSISTANT: 'AI_ASSISTANT', // AI 예약 도우미 응답
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const ROOM_TYPE_VALUES = Object.values(RoomType) as [RoomType, ...RoomType[]];
export const MESSAGE_TYPE_VALUES = Object.values(MessageType) as [MessageType, ...MessageType[]];
