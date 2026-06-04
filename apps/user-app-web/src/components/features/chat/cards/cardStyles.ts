// 채팅 AI 응답 카드 공통 너비 토큰 (일관성 단일 소스)
// - 모바일: 단일 너비. 바깥 버블 max-w-[85%] 안에서 max-w-[420px] 로 캡 → 모든 카드 동일 너비.
// - 데스크톱(md ≥ 768px): 두 가지로 통일.
//     · 표준(CHAT_CARD_WIDTH)      : 360px — 선택·결제·정보량 많은 인터랙티브 카드
//     · 컴팩트(CHAT_CARD_WIDTH_COMPACT): 320px — 상태·알림성 카드
export const CHAT_CARD_WIDTH = 'w-full min-w-[260px] max-w-[420px] md:max-w-[360px]';
export const CHAT_CARD_WIDTH_COMPACT = 'w-full min-w-[260px] max-w-[420px] md:max-w-[320px]';
