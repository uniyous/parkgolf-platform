// 채팅 AI 응답 카드 공통 너비 토큰 (일관성 단일 소스)
//
// 카드는 말풍선 박스(텍스트와 같은 박스) 안에 들어가는데, 박스는 텍스트 길이에 따라
// 늘었다 줄었다 한다. 카드가 w-full 이면 그 박스를 따라 너비가 변한다(긴 응답 →
// 카드도 넓어짐). 이를 막기 위해:
// - 데스크톱(md ≥ 768px): w-[..] 고정 너비로 텍스트 폭과 분리 → 응답 길이와 무관하게 일정.
//     · 표준(CHAT_CARD_WIDTH)         : 360px — 선택·결제·정보량 많은 인터랙티브 카드
//     · 컴팩트(CHAT_CARD_WIDTH_COMPACT): 320px — 상태·알림성 카드
// - 모바일: 바깥 버블 max-w-[85%] 를 존중해야 작은 화면 overflow가 없으므로 w-full 유지
//   (좁은 화면에선 고정 px가 버블을 넘어 가로 스크롤을 유발). min-w-[260px]/max-w-[420px] 로 캡.
export const CHAT_CARD_WIDTH = 'w-full min-w-[260px] max-w-[420px] md:w-[360px]';
export const CHAT_CARD_WIDTH_COMPACT = 'w-full min-w-[260px] max-w-[420px] md:w-[320px]';
