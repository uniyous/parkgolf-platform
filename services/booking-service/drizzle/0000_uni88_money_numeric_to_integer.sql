-- UNI-88: booking_db 금액 컬럼 Decimal(numeric) → integer (KRW 원 단위)
-- 사전 검증: 전 테이블 분수값 0 (price <> floor(price) 카운트 0) 확인됨.
-- 배포 순서: 신규 drizzle pod 롤아웃(구 Prisma pod 종료) 후 적용 → 오류 윈도우 0.
-- (신규 코드는 금액 read를 전부 Number()로 강제하여 numeric/integer 양쪽 호환)

ALTER TABLE bookings
  ALTER COLUMN price_per_person TYPE integer USING price_per_person::integer,
  ALTER COLUMN service_fee      TYPE integer USING service_fee::integer,
  ALTER COLUMN total_price      TYPE integer USING total_price::integer;

ALTER TABLE game_cache
  ALTER COLUMN base_price    TYPE integer USING base_price::integer,
  ALTER COLUMN weekend_price TYPE integer USING weekend_price::integer,
  ALTER COLUMN holiday_price TYPE integer USING holiday_price::integer;

ALTER TABLE game_time_slot_cache
  ALTER COLUMN price TYPE integer USING price::integer;

ALTER TABLE payments
  ALTER COLUMN amount TYPE integer USING amount::integer;

ALTER TABLE refunds
  ALTER COLUMN original_amount TYPE integer USING original_amount::integer,
  ALTER COLUMN refund_amount   TYPE integer USING refund_amount::integer,
  ALTER COLUMN refund_fee      TYPE integer USING refund_fee::integer;
