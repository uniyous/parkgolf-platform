-- UNI-90: club_db 금액 컬럼 Decimal(numeric) → integer (KRW 원 단위)
-- 사전 검증: game_time_slots.price, games.base_price/weekend_price/holiday_price 분수값 0 확인됨.
-- 배포 순서: 신규 drizzle pod 롤아웃(구 Prisma pod 종료) 후 적용 → 오류 윈도우 0.
-- (신규 코드는 금액 read를 Number()로 강제하여 numeric/integer 양쪽 호환)

ALTER TABLE games
  ALTER COLUMN base_price    TYPE integer USING base_price::integer,
  ALTER COLUMN weekend_price TYPE integer USING weekend_price::integer,
  ALTER COLUMN holiday_price TYPE integer USING holiday_price::integer;

ALTER TABLE game_time_slots
  ALTER COLUMN price TYPE integer USING price::integer;
