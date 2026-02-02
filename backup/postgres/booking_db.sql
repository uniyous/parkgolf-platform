--
-- PostgreSQL database dump
--

\restrict sL9WFCCFps8JvL0P1GBojO6YzueNPtnjMvgWjIdE8P1sr5ve16IW3YoTWwip3LL

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'NO_SHOW',
    'SLOT_RESERVED',
    'FAILED'
);


--
-- Name: CancellationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CancellationType" AS ENUM (
    'USER_NORMAL',
    'USER_LATE',
    'USER_LASTMINUTE',
    'ADMIN',
    'SYSTEM'
);


--
-- Name: NoShowPenaltyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NoShowPenaltyType" AS ENUM (
    'WARNING',
    'RESTRICTION',
    'FEE',
    'BLACKLIST'
);


--
-- Name: OutboxStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OutboxStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED'
);


--
-- Name: RefundStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RefundStatus" AS ENUM (
    'REQUESTED',
    'PENDING',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_history (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: booking_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_history_id_seq OWNED BY public.booking_history.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    booking_date timestamp(3) without time zone NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    front_nine_course_id integer,
    front_nine_course_name text,
    back_nine_course_id integer,
    back_nine_course_name text,
    user_id integer,
    guest_name text,
    guest_email text,
    guest_phone text,
    player_count integer DEFAULT 1 NOT NULL,
    price_per_person numeric(10,2) NOT NULL,
    service_fee numeric(10,2) DEFAULT 0 NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    payment_method text,
    special_requests text,
    booking_number text NOT NULL,
    notes text,
    user_email text,
    user_name text,
    user_phone text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    club_id integer,
    club_name text,
    game_code text,
    game_id integer NOT NULL,
    game_name text,
    game_time_slot_id integer NOT NULL,
    idempotency_key text,
    saga_fail_reason text
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: cancellation_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancellation_policies (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    allow_user_cancel boolean DEFAULT true NOT NULL,
    user_cancel_deadline_hours integer DEFAULT 72 NOT NULL,
    allow_same_day_cancel boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    club_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: cancellation_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cancellation_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cancellation_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cancellation_policies_id_seq OWNED BY public.cancellation_policies.id;


--
-- Name: game_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_cache (
    id integer NOT NULL,
    game_id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    front_nine_course_id integer NOT NULL,
    front_nine_course_name text NOT NULL,
    back_nine_course_id integer NOT NULL,
    back_nine_course_name text NOT NULL,
    total_holes integer DEFAULT 18 NOT NULL,
    estimated_duration integer DEFAULT 180 NOT NULL,
    break_duration integer DEFAULT 10 NOT NULL,
    max_players integer DEFAULT 4 NOT NULL,
    base_price numeric(10,2) NOT NULL,
    weekend_price numeric(10,2),
    holiday_price numeric(10,2),
    club_id integer NOT NULL,
    club_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: game_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.game_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: game_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.game_cache_id_seq OWNED BY public.game_cache.id;


--
-- Name: game_time_slot_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_time_slot_cache (
    id integer NOT NULL,
    game_time_slot_id integer NOT NULL,
    game_id integer NOT NULL,
    game_name text,
    game_code text,
    front_nine_course_name text,
    back_nine_course_name text,
    club_id integer,
    club_name text,
    date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    max_players integer DEFAULT 4 NOT NULL,
    booked_players integer DEFAULT 0 NOT NULL,
    available_players integer DEFAULT 4 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    price numeric(10,2) NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    status text DEFAULT 'AVAILABLE'::text NOT NULL,
    last_sync_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: game_time_slot_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.game_time_slot_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: game_time_slot_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.game_time_slot_cache_id_seq OWNED BY public.game_time_slot_cache.id;


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    id integer NOT NULL,
    key text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text,
    response_status integer,
    response_body jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


--
-- Name: idempotency_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.idempotency_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: idempotency_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.idempotency_keys_id_seq OWNED BY public.idempotency_keys.id;


--
-- Name: noshow_penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.noshow_penalties (
    id integer NOT NULL,
    noshow_policy_id integer NOT NULL,
    min_count integer NOT NULL,
    max_count integer,
    penalty_type public."NoShowPenaltyType" NOT NULL,
    restriction_days integer,
    fee_amount integer,
    fee_rate integer,
    label text,
    message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: noshow_penalties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.noshow_penalties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: noshow_penalties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.noshow_penalties_id_seq OWNED BY public.noshow_penalties.id;


--
-- Name: noshow_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.noshow_policies (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    allow_refund_on_noshow boolean DEFAULT false NOT NULL,
    noshow_grace_minutes integer DEFAULT 30 NOT NULL,
    count_reset_days integer DEFAULT 365 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    club_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: noshow_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.noshow_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: noshow_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.noshow_policies_id_seq OWNED BY public.noshow_policies.id;


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    id integer NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status public."OutboxStatus" DEFAULT 'PENDING'::public."OutboxStatus" NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp(3) without time zone
);


--
-- Name: outbox_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.outbox_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: outbox_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.outbox_events_id_seq OWNED BY public.outbox_events.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    transaction_id text,
    paid_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: refund_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_policies (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    admin_cancel_refund_rate integer DEFAULT 100 NOT NULL,
    system_cancel_refund_rate integer DEFAULT 100 NOT NULL,
    min_refund_amount integer DEFAULT 0 NOT NULL,
    refund_fee integer DEFAULT 0 NOT NULL,
    refund_fee_rate integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    club_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: refund_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_policies_id_seq OWNED BY public.refund_policies.id;


--
-- Name: refund_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_tiers (
    id integer NOT NULL,
    refund_policy_id integer NOT NULL,
    min_hours_before integer NOT NULL,
    max_hours_before integer,
    refund_rate integer NOT NULL,
    label text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: refund_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_tiers_id_seq OWNED BY public.refund_tiers.id;


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    payment_id integer,
    original_amount numeric(10,2) NOT NULL,
    refund_amount numeric(10,2) NOT NULL,
    refund_rate integer NOT NULL,
    refund_fee numeric(10,2) DEFAULT 0 NOT NULL,
    status public."RefundStatus" DEFAULT 'REQUESTED'::public."RefundStatus" NOT NULL,
    cancellation_type public."CancellationType" NOT NULL,
    cancel_reason text,
    cancelled_by integer,
    cancelled_by_type text,
    pg_transaction_id text,
    pg_refund_id text,
    processed_at timestamp(3) without time zone,
    processed_by integer,
    rejected_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: refunds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refunds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refunds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refunds_id_seq OWNED BY public.refunds.id;


--
-- Name: user_noshow_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_noshow_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    booking_id integer NOT NULL,
    noshow_at timestamp(3) without time zone NOT NULL,
    processed_by integer,
    notes text,
    is_reset boolean DEFAULT false NOT NULL,
    reset_at timestamp(3) without time zone,
    reset_by integer,
    reset_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_noshow_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_noshow_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_noshow_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_noshow_records_id_seq OWNED BY public.user_noshow_records.id;


--
-- Name: booking_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_history ALTER COLUMN id SET DEFAULT nextval('public.booking_history_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: cancellation_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_policies ALTER COLUMN id SET DEFAULT nextval('public.cancellation_policies_id_seq'::regclass);


--
-- Name: game_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_cache ALTER COLUMN id SET DEFAULT nextval('public.game_cache_id_seq'::regclass);


--
-- Name: game_time_slot_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_time_slot_cache ALTER COLUMN id SET DEFAULT nextval('public.game_time_slot_cache_id_seq'::regclass);


--
-- Name: idempotency_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys ALTER COLUMN id SET DEFAULT nextval('public.idempotency_keys_id_seq'::regclass);


--
-- Name: noshow_penalties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noshow_penalties ALTER COLUMN id SET DEFAULT nextval('public.noshow_penalties_id_seq'::regclass);


--
-- Name: noshow_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noshow_policies ALTER COLUMN id SET DEFAULT nextval('public.noshow_policies_id_seq'::regclass);


--
-- Name: outbox_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events ALTER COLUMN id SET DEFAULT nextval('public.outbox_events_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: refund_policies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_policies ALTER COLUMN id SET DEFAULT nextval('public.refund_policies_id_seq'::regclass);


--
-- Name: refund_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_tiers ALTER COLUMN id SET DEFAULT nextval('public.refund_tiers_id_seq'::regclass);


--
-- Name: refunds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds ALTER COLUMN id SET DEFAULT nextval('public.refunds_id_seq'::regclass);


--
-- Name: user_noshow_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_noshow_records ALTER COLUMN id SET DEFAULT nextval('public.user_noshow_records_id_seq'::regclass);


--
-- Data for Name: booking_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.booking_history (id, booking_id, action, details, user_id, created_at) FROM stdin;
1	4	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "tosspay", "gameTimeSlotId": 703, "idempotencyKey": "1a145922-285f-402f-8eca-3a9dd6a070a9"}	23	2026-01-05 04:57:31.203
4	5	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "tosspay", "gameTimeSlotId": 703, "idempotencyKey": "7f2f8a26-2a63-4d22-9602-8954b1c122bd"}	23	2026-01-05 04:58:01.202
5	4	SLOT_RESERVED	{"reservedAt": "2026-01-05T04:58:00.896Z", "playerCount": 2, "gameTimeSlotId": 703}	23	2026-01-05 04:58:01.214
6	4	CONFIRMED	{"confirmedAt": "2026-01-05T04:58:01.219Z"}	23	2026-01-05 04:58:01.22
7	5	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-05T04:58:07.021Z"}	23	2026-01-05 04:58:07.022
8	6	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "123600", "playerCount": 4, "paymentMethod": "naverpay", "gameTimeSlotId": 927, "idempotencyKey": "6209cc2a-674f-4cc1-82f7-f4a7e3c390ef"}	23	2026-01-05 06:45:59.236
9	6	SLOT_RESERVED	{"reservedAt": "2026-01-05T06:46:05.273Z", "playerCount": 4, "gameTimeSlotId": 927}	23	2026-01-05 06:46:05.793
10	6	CONFIRMED	{"confirmedAt": "2026-01-05T06:46:05.795Z"}	23	2026-01-05 06:46:05.796
11	7	SAGA_STARTED	{"gameName": "부산 파크골프장 497261-4 라운드", "totalPrice": "164800", "playerCount": 4, "paymentMethod": "naverpay", "gameTimeSlotId": 34790, "idempotencyKey": "1491e6a4-e4c1-4720-9a11-03e11a005b7f"}	22	2026-01-05 12:31:17.314
14	7	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-05T12:31:35.113Z"}	22	2026-01-05 12:31:35.308
15	8	SAGA_STARTED	{"gameName": "부산 파크골프장 497261-4 라운드", "totalPrice": "164800", "playerCount": 4, "paymentMethod": "naverpay", "gameTimeSlotId": 34790, "idempotencyKey": "f8e6bf64-400b-485a-85fa-4ae53fdbaa54"}	22	2026-01-05 12:31:35.343
16	8	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-05T12:31:46.914Z"}	22	2026-01-05 12:31:47.014
17	9	SAGA_STARTED	{"gameName": "서울 파크골프장 281603-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "tosspay", "gameTimeSlotId": 14997, "idempotencyKey": "8cf6de08-f546-4291-a89c-cd8e8dc941f7"}	22	2026-01-06 04:35:27.613
18	9	SLOT_RESERVED	{"reservedAt": "2026-01-06T04:35:34.094Z", "playerCount": 4, "gameTimeSlotId": 14997}	22	2026-01-06 04:35:40.62
19	9	CONFIRMED	{"confirmedAt": "2026-01-06T04:35:40.626Z"}	22	2026-01-06 04:35:40.627
20	10	SAGA_STARTED	{"gameName": "광주 파크골프장 497261-6 라운드", "totalPrice": "164800", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 35623, "idempotencyKey": "8fb0f808-f9f8-47e0-a5c9-88229c76b8f8"}	22	2026-01-06 05:08:33.237
23	12	SAGA_STARTED	{"gameName": "광주 파크골프장 497261-6 라운드", "totalPrice": "164800", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 35623, "idempotencyKey": "89590b5c-d71d-468b-aedb-bbe41ed0b4cf"}	22	2026-01-06 05:09:16.921
24	12	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-06T05:09:22.718Z"}	22	2026-01-06 05:09:22.919
25	10	SAGA_TIMEOUT	{"timeoutAt": "2026-01-06T05:10:01.818Z", "timeoutMs": 60000}	22	2026-01-06 05:10:02.419
26	13	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 847, "idempotencyKey": "89001c5d-8a11-406c-bd59-89eaa1efc894"}	21	2026-01-06 05:46:32.249
27	13	SAGA_FAILED	{"reason": "\\nInvalid `tx.gameTimeSlot.findUnique()` invocation in\\n/app/dist/src/game/service/game-time-slot.service.js:364:56\\n\\n  361 attempt++;\\n  362 try {\\n  363     const result = await this.prisma.$transaction(async (tx) => {\\n→ 364         const slot = await tx.gameTimeSlot.findUnique(\\nTransaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5293 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction.", "failedAt": "2026-01-06T05:46:52.222Z"}	21	2026-01-06 05:46:52.223
28	13	SLOT_RESERVED	{"reservedAt": "2026-01-06T05:46:50.203Z", "playerCount": 2, "gameTimeSlotId": 847}	21	2026-01-06 05:46:52.233
29	13	CONFIRMED	{"confirmedAt": "2026-01-06T05:46:52.235Z"}	21	2026-01-06 05:46:52.236
30	14	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 848, "idempotencyKey": "7f93aac3-f712-4813-a074-9974f4b5f1e8"}	21	2026-01-06 06:04:26.242
33	14	SAGA_TIMEOUT	{"timeoutAt": "2026-01-06T06:06:02.342Z", "timeoutMs": 60000}	21	2026-01-06 06:06:02.343
34	15	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 848, "idempotencyKey": "7455a66d-a25b-47dd-8905-2842b7961643"}	21	2026-01-06 06:47:03.066
35	15	SLOT_RESERVED	{"reservedAt": "2026-01-06T06:47:28.134Z", "playerCount": 2, "gameTimeSlotId": 848}	21	2026-01-06 06:47:33.009
36	15	CONFIRMED	{"confirmedAt": "2026-01-06T06:47:33.023Z"}	21	2026-01-06 06:47:33.024
37	16	SAGA_STARTED	{"gameName": "경기 파크골프장 281603-2 라운드", "totalPrice": "206000", "playerCount": 4, "paymentMethod": "card", "gameTimeSlotId": 17019, "idempotencyKey": "38a2596c-2322-4035-95bc-390e9dc6ebca"}	22	2026-01-06 07:08:32.611
38	16	SLOT_RESERVED	{"reservedAt": "2026-01-06T07:08:33.151Z", "playerCount": 4, "gameTimeSlotId": 17019}	22	2026-01-06 07:08:33.187
39	16	CONFIRMED	{"confirmedAt": "2026-01-06T07:08:33.190Z"}	22	2026-01-06 07:08:33.191
40	17	SAGA_STARTED	{"gameName": "경기 파크골프장 497261-2 라운드", "totalPrice": "200850", "playerCount": 3, "paymentMethod": "naverpay", "gameTimeSlotId": 34013, "idempotencyKey": "95ed9f77-597a-410c-9bcc-139400eac172"}	22	2026-01-10 06:27:44.229
41	17	SLOT_RESERVED	{"reservedAt": "2026-01-10T06:27:44.639Z", "playerCount": 3, "gameTimeSlotId": 34013}	22	2026-01-10 06:27:44.696
42	17	CONFIRMED	{"confirmedAt": "2026-01-10T06:27:44.699Z"}	22	2026-01-10 06:27:44.7
43	19	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 1387, "idempotencyKey": "99aac7cc-b0b7-4ad1-b9d5-d14052598239"}	3	2026-01-13 14:52:26.248
47	19	SLOT_RESERVED	{"reservedAt": "2026-01-13T14:53:03.375Z", "playerCount": 2, "gameTimeSlotId": 1387}	3	2026-01-13 14:53:08
48	19	CONFIRMED	{"confirmedAt": "2026-01-13T14:53:08.008Z"}	3	2026-01-13 14:53:08.009
49	20	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 1387, "idempotencyKey": "6978e18c-e22e-43b4-a63c-be83da375e73"}	3	2026-01-13 15:09:37.049
52	20	SAGA_TIMEOUT	{"timeoutAt": "2026-01-13T15:11:01.447Z", "timeoutMs": 60000}	3	2026-01-13 15:11:01.448
53	23	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 1388, "idempotencyKey": "2b886c13-e1b8-4437-b8f6-04bab466c215"}	3	2026-01-13 15:18:08.209
54	23	SLOT_RESERVED	{"reservedAt": "2026-01-13T15:18:16.189Z", "playerCount": 2, "gameTimeSlotId": 1388}	3	2026-01-13 15:18:20.047
55	23	CONFIRMED	{"confirmedAt": "2026-01-13T15:18:20.748Z"}	3	2026-01-13 15:18:20.749
56	24	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 1388, "idempotencyKey": "a0c8ab75-7139-49a1-b2c0-7771ca0188a5"}	3	2026-01-13 15:48:56.147
59	24	SAGA_TIMEOUT	{"timeoutAt": "2026-01-13T15:50:02.247Z", "timeoutMs": 60000}	3	2026-01-13 15:50:02.446
60	25	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 1459, "idempotencyKey": "d251cf79-9eaa-4e3a-8ea9-b4cc4553f72a"}	3	2026-01-14 02:15:56.348
63	25	SAGA_TIMEOUT	{"timeoutAt": "2026-01-14T02:17:02.247Z", "timeoutMs": 60000}	3	2026-01-14 02:17:02.248
64	26	SAGA_STARTED	{"gameName": "서울 파크골프장 721408-1 라운드", "totalPrice": "123600", "playerCount": 3, "paymentMethod": "card", "gameTimeSlotId": 31130, "idempotencyKey": "9bc0db37-7a53-4e94-a1e8-bd0219d9a181"}	3	2026-01-14 13:03:13.992
65	27	SAGA_STARTED	{"gameName": "서울 파크골프장 721408-1 라운드", "totalPrice": "123600", "playerCount": 3, "paymentMethod": "card", "gameTimeSlotId": 31130, "idempotencyKey": "a8f3ba78-b2a1-4012-bbdb-b756f06d97a1"}	3	2026-01-14 13:03:22.162
66	27	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-14T13:04:00.862Z"}	3	2026-01-14 13:04:01.163
67	26	SAGA_TIMEOUT	{"timeoutAt": "2026-01-14T13:05:01.961Z", "timeoutMs": 60000}	3	2026-01-14 13:05:02.262
68	28	SAGA_STARTED	{"gameName": "인천 파크골프장 325455-3 라운드", "totalPrice": "92700", "playerCount": 3, "paymentMethod": "naverpay", "gameTimeSlotId": 29672, "idempotencyKey": "6ea19519-6904-46c3-95ee-b9c47fb50b7c"}	3	2026-01-14 13:05:42.462
71	30	SAGA_STARTED	{"gameName": "인천 파크골프장 325455-3 라운드", "totalPrice": "92700", "playerCount": 3, "paymentMethod": "naverpay", "gameTimeSlotId": 29672, "idempotencyKey": "4325348d-1b06-4492-ad29-c94ff0bcf13b"}	3	2026-01-14 13:06:02.991
72	30	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-14T13:06:14.282Z"}	3	2026-01-14 13:06:14.862
73	28	SAGA_TIMEOUT	{"timeoutAt": "2026-01-14T13:07:02.062Z", "timeoutMs": 60000}	3	2026-01-14 13:07:02.262
74	31	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 38615, "idempotencyKey": "a4cda55f-7def-4a41-83b7-af66af808243"}	3	2026-01-14 13:24:13.362
75	31	SAGA_TIMEOUT	{"timeoutAt": "2026-01-14T13:26:01.972Z", "timeoutMs": 60000}	3	2026-01-14 13:26:02.163
76	32	SAGA_STARTED	{"gameName": "인천 파크골프장 281603-3 라운드", "totalPrice": "92700", "playerCount": 3, "paymentMethod": "kakaopay", "gameTimeSlotId": 19093, "idempotencyKey": "91b01adb-6f0d-4080-89e3-44f4fb239a38"}	3	2026-01-14 13:45:35.265
77	32	SLOT_RESERVED	{"reservedAt": "2026-01-14T13:45:51.934Z", "playerCount": 3, "gameTimeSlotId": 19093}	3	2026-01-14 13:46:05.295
78	32	CONFIRMED	{"confirmedAt": "2026-01-14T13:46:05.309Z"}	3	2026-01-14 13:46:05.31
79	34	SAGA_STARTED	{"gameName": "인천 파크골프장 281603-3 라운드", "totalPrice": "92700", "playerCount": 3, "paymentMethod": "kakaopay", "gameTimeSlotId": 19093, "idempotencyKey": "5d52bdad-60f2-4bfc-960a-f87334fd8349"}	3	2026-01-14 13:46:05.319
80	34	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-14T13:46:16.225Z"}	3	2026-01-14 13:46:17.126
81	36	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "tosspay", "gameTimeSlotId": 38603, "idempotencyKey": "f12a4178-0657-48ea-97a2-170ca2fa5beb"}	4	2026-01-14 14:23:47.226
82	36	SLOT_RESERVED	{"reservedAt": "2026-01-14T14:23:52.187Z", "playerCount": 4, "gameTimeSlotId": 38603}	4	2026-01-14 14:23:55.927
83	36	CONFIRMED	{"confirmedAt": "2026-01-14T14:23:56.526Z"}	4	2026-01-14 14:23:56.826
84	37	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "kakaopay", "gameTimeSlotId": 1851, "idempotencyKey": "03bcdec9-d6c0-47b7-a3d2-5f5b83e8fe0d"}	4	2026-01-19 01:05:54.327
85	37	SLOT_RESERVED	{"reservedAt": "2026-01-19T01:06:11.057Z", "playerCount": 2, "gameTimeSlotId": 1851}	4	2026-01-19 01:06:17.813
86	37	CONFIRMED	{"confirmedAt": "2026-01-19T01:06:17.818Z"}	4	2026-01-19 01:06:17.819
87	37	SLOT_RESERVED	{"reservedAt": "2026-01-19T01:06:16.057Z", "playerCount": 2, "gameTimeSlotId": 1851}	4	2026-01-19 01:06:17.835
88	37	CONFIRMED	{"confirmedAt": "2026-01-19T01:06:17.839Z"}	4	2026-01-19 01:06:17.84
89	38	SAGA_STARTED	{"gameName": "경기 파크골프장 281603-2 라운드", "totalPrice": "206000", "playerCount": 4, "paymentMethod": "naverpay", "gameTimeSlotId": 17428, "idempotencyKey": "DEF36E1B-A868-4B80-BE76-672A872340E4"}	6	2026-01-22 03:44:49.213
90	38	SLOT_RESERVED	{"reservedAt": "2026-01-22T03:44:51.173Z", "playerCount": 4, "gameTimeSlotId": 17428}	6	2026-01-22 03:44:54.021
91	38	CONFIRMED	{"confirmedAt": "2026-01-22T03:44:54.318Z"}	6	2026-01-22 03:44:54.319
92	41	SAGA_STARTED	{"gameName": "A+B 코스", "totalPrice": "61800", "playerCount": 2, "paymentMethod": "kakaopay", "gameTimeSlotId": 2071, "idempotencyKey": "8533e0b8-2ee0-41c5-8009-e8057bfcd161"}	4	2026-01-23 02:59:11.629
93	41	SLOT_RESERVED	{"reservedAt": "2026-01-23T02:59:18.776Z", "playerCount": 2, "gameTimeSlotId": 2071}	4	2026-01-23 02:59:22.528
94	41	CONFIRMED	{"confirmedAt": "2026-01-23T02:59:24.028Z"}	4	2026-01-23 02:59:24.428
95	42	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 38952, "idempotencyKey": "decfb47c-5746-4a98-b651-b23b3187291e"}	4	2026-01-27 05:58:41.027
96	43	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 38952, "idempotencyKey": "2a050f8c-3075-43b3-b9b1-dad486b15888"}	4	2026-01-27 05:58:47.826
97	42	SLOT_RESERVED	{"reservedAt": "2026-01-27T05:58:50.017Z", "playerCount": 4, "gameTimeSlotId": 38952}	4	2026-01-27 05:58:56.377
98	42	CONFIRMED	{"confirmedAt": "2026-01-27T05:58:56.379Z"}	4	2026-01-27 05:58:56.38
99	43	SAGA_FAILED	{"reason": "Time slot is not available (status: FULLY_BOOKED)", "failedAt": "2026-01-27T05:59:07.726Z"}	4	2026-01-27 05:59:07.925
100	44	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "tosspay", "gameTimeSlotId": 39199, "idempotencyKey": "92E59D2E-6D16-44B0-9A8D-25322DCD664A"}	6	2026-01-27 06:08:12.226
101	44	SLOT_RESERVED	{"reservedAt": "2026-01-27T06:08:19.206Z", "playerCount": 4, "gameTimeSlotId": 39199}	6	2026-01-27 06:08:23.026
102	44	CONFIRMED	{"confirmedAt": "2026-01-27T06:08:23.425Z"}	6	2026-01-27 06:08:23.426
103	45	SAGA_STARTED	{"gameName": "서울 파크골프장 972452-1 라운드", "totalPrice": "247200", "playerCount": 4, "paymentMethod": "kakaopay", "gameTimeSlotId": 39091, "idempotencyKey": "2288132F-9A1B-49D0-8260-1AF3C5FD3E53"}	5	2026-01-28 14:29:23.87
104	45	SLOT_RESERVED	{"reservedAt": "2026-01-28T14:29:24.564Z", "playerCount": 4, "gameTimeSlotId": 39091}	5	2026-01-28 14:29:24.61
105	45	CONFIRMED	{"confirmedAt": "2026-01-28T14:29:24.613Z"}	5	2026-01-28 14:29:24.614
106	46	SAGA_STARTED	{"gameName": "서울 파크골프장 721408-1 라운드", "totalPrice": "82400", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 33268, "idempotencyKey": "5fa90330-1f4f-4400-8196-7a148190cb00"}	3	2026-02-01 04:48:25.085
107	46	SLOT_RESERVED	{"reservedAt": "2026-02-01T04:48:25.197Z", "playerCount": 2, "gameTimeSlotId": 33268}	3	2026-02-01 04:48:25.263
108	46	CONFIRMED	{"confirmedAt": "2026-02-01T04:48:25.264Z"}	3	2026-02-01 04:48:25.265
109	47	SAGA_STARTED	{"gameName": "서울 파크골프장 721408-1 라운드", "totalPrice": "41200", "playerCount": 1, "paymentMethod": "card", "gameTimeSlotId": 33268, "idempotencyKey": "434b19cd-cab8-4885-9a8d-3fda45441621"}	3	2026-02-01 04:48:32.917
110	47	SLOT_RESERVED	{"reservedAt": "2026-02-01T04:48:33.003Z", "playerCount": 1, "gameTimeSlotId": 33268}	3	2026-02-01 04:48:33.024
111	47	CONFIRMED	{"confirmedAt": "2026-02-01T04:48:33.025Z"}	3	2026-02-01 04:48:33.026
112	48	SAGA_STARTED	{"gameName": "서울 파크골프장 721408-1 라운드", "totalPrice": "82400", "playerCount": 2, "paymentMethod": "card", "gameTimeSlotId": 33269, "idempotencyKey": "8781b9e6-88ec-45e4-b4aa-92c6ab1e689d"}	3	2026-02-01 04:48:40.756
113	48	SLOT_RESERVED	{"reservedAt": "2026-02-01T04:48:40.917Z", "playerCount": 2, "gameTimeSlotId": 33269}	3	2026-02-01 04:48:40.931
114	48	CONFIRMED	{"confirmedAt": "2026-02-01T04:48:40.932Z"}	3	2026-02-01 04:48:40.933
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, booking_date, start_time, end_time, front_nine_course_id, front_nine_course_name, back_nine_course_id, back_nine_course_name, user_id, guest_name, guest_email, guest_phone, player_count, price_per_person, service_fee, total_price, status, payment_method, special_requests, booking_number, notes, user_email, user_name, user_phone, created_at, updated_at, club_id, club_name, game_code, game_id, game_name, game_time_slot_id, idempotency_key, saga_fail_reason) FROM stdin;
1	2025-12-29 00:00:00	06:00	06:10	1	코스 A	2	코스 B	12	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	card	창가 자리 요청	BK-C54AB04A-5945	\N	testuser2@example.com	테스트유저2	010-9999-8888	2025-12-23 06:47:36.83	2025-12-23 06:47:36.83	1	강남 파크골프 클럽	G-001	1	A+B 코스	1	\N	\N
4	2026-01-05 00:00:00	06:00	09:00	1	A 코스	2	B 코스	23	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	tosspay	\N	BK-2D2EBCF0-FF43	\N	park@parkgolf.com	박영희	\N	2026-01-05 04:57:30.52	2026-01-05 04:58:01.207	1	강남 파크골프 클럽	AB	1	A+B 코스	703	1a145922-285f-402f-8eca-3a9dd6a070a9	\N
5	2026-01-05 00:00:00	06:00	09:00	1	A 코스	2	B 코스	23	\N	\N	\N	2	30000.00	1800.00	61800.00	FAILED	tosspay	\N	BK-8A41973F-E318	\N	park@parkgolf.com	박영희	\N	2026-01-05 04:57:58.821	2026-01-05 04:58:05.321	1	강남 파크골프 클럽	AB	1	A+B 코스	703	7f2f8a26-2a63-4d22-9602-8954b1c122bd	Time slot is not available (status: FULLY_BOOKED)
6	2026-01-08 00:00:00	07:20	10:20	1	A 코스	2	B 코스	23	\N	\N	\N	4	30000.00	3600.00	123600.00	CONFIRMED	naverpay	\N	BK-7CBBCA8D-C30C	\N	park@parkgolf.com	박영희	\N	2026-01-05 06:45:57.137	2026-01-05 06:46:05.786	1	강남 파크골프 클럽	AB	1	A+B 코스	927	6209cc2a-674f-4cc1-82f7-f4a7e3c390ef	\N
7	2026-01-07 00:00:00	15:52	18:26	304	부산 파크골프장 497261-4 - A코스	305	부산 파크골프장 497261-4 - B코스	22	\N	\N	\N	4	40000.00	4800.00	164800.00	FAILED	naverpay	\N	BK-C5325A8B-4C35	\N	kim@parkgolf.com	김철수	\N	2026-01-05 12:31:15.514	2026-01-05 12:31:32.314	135	부산 파크골프장 497261-4	497261-G4	127	부산 파크골프장 497261-4 라운드	34790	1491e6a4-e4c1-4720-9a11-03e11a005b7f	Time slot is not available (status: FULLY_BOOKED)
8	2026-01-07 00:00:00	15:52	18:26	304	부산 파크골프장 497261-4 - A코스	305	부산 파크골프장 497261-4 - B코스	22	\N	\N	\N	4	40000.00	4800.00	164800.00	FAILED	naverpay	\N	BK-1FE5F3B8-41C4	\N	kim@parkgolf.com	김철수	\N	2026-01-05 12:31:35.327	2026-01-05 12:31:46.514	135	부산 파크골프장 497261-4	497261-G4	127	부산 파크골프장 497261-4 라운드	34790	f8e6bf64-400b-485a-85fa-4ae53fdbaa54	Time slot is not available (status: FULLY_BOOKED)
9	2026-01-07 00:00:00	07:50	10:38	144	서울 파크골프장 281603-1 - A코스	145	서울 파크골프장 281603-1 - B코스	22	\N	\N	\N	4	60000.00	7200.00	247200.00	CONFIRMED	tosspay	\N	BK-F05308E1-5C3A	\N	kim@parkgolf.com	김철수	\N	2026-01-06 04:35:25.714	2026-01-06 04:35:38.213	82	서울 파크골프장 281603-1	281603-G1	74	서울 파크골프장 281603-1 라운드	14997	8cf6de08-f546-4291-a89c-cd8e8dc941f7	\N
12	2026-01-09 00:00:00	09:44	12:59	309	광주 파크골프장 497261-6 - A코스	310	광주 파크골프장 497261-6 - B코스	22	\N	\N	\N	4	40000.00	4800.00	164800.00	FAILED	kakaopay	\N	BK-EE986E59-A98C	\N	kim@parkgolf.com	김철수	\N	2026-01-06 05:09:15.419	2026-01-06 05:09:21.818	137	광주 파크골프장 497261-6	497261-G6	129	광주 파크골프장 497261-6 라운드	35623	89590b5c-d71d-468b-aedb-bbe41ed0b4cf	Time slot is not available (status: FULLY_BOOKED)
10	2026-01-09 00:00:00	09:44	12:59	309	광주 파크골프장 497261-6 - A코스	310	광주 파크골프장 497261-6 - B코스	22	\N	\N	\N	4	40000.00	4800.00	164800.00	FAILED	kakaopay	\N	BK-BE94088B-506A	\N	kim@parkgolf.com	김철수	\N	2026-01-06 05:08:32.318	2026-01-06 05:10:01.118	137	광주 파크골프장 497261-6	497261-G6	129	광주 파크골프장 497261-6 라운드	35623	8fb0f808-f9f8-47e0-a5c9-88229c76b8f8	Saga timeout - slot reservation not confirmed in time
13	2026-01-07 00:00:00	06:00	09:00	1	A 코스	2	B 코스	21	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	card	\N	BK-25BB73EA-ECF3	\N	test@parkgolf.com	테스트사용자	\N	2026-01-06 05:46:29.449	2026-01-06 05:46:52.22	1	강남 파크골프 클럽	AB	1	A+B 코스	847	89001c5d-8a11-406c-bd59-89eaa1efc894	\nInvalid `tx.gameTimeSlot.findUnique()` invocation in\n/app/dist/src/game/service/game-time-slot.service.js:364:56\n\n  361 attempt++;\n  362 try {\n  363     const result = await this.prisma.$transaction(async (tx) => {\n→ 364         const slot = await tx.gameTimeSlot.findUnique(\nTransaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5293 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction.
14	2026-01-07 00:00:00	06:10	09:10	1	A 코스	2	B 코스	21	\N	\N	\N	2	30000.00	1800.00	61800.00	FAILED	card	\N	BK-DFC51335-E936	\N	test@parkgolf.com	테스트사용자	\N	2026-01-06 06:04:23.342	2026-01-06 06:06:01.043	1	강남 파크골프 클럽	AB	1	A+B 코스	848	7f93aac3-f712-4813-a074-9974f4b5f1e8	Saga timeout - slot reservation not confirmed in time
15	2026-01-07 00:00:00	06:10	09:10	1	A 코스	2	B 코스	21	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	card	\N	BK-8A13F548-A57C	\N	test@parkgolf.com	테스트사용자	\N	2026-01-06 06:47:03.046	2026-01-06 06:47:32.109	1	강남 파크골프 클럽	AB	1	A+B 코스	848	7455a66d-a25b-47dd-8905-2842b7961643	\N
16	2026-01-15 00:00:00	10:12	12:50	147	경기 파크골프장 281603-2 - A코스	148	경기 파크골프장 281603-2 - B코스	22	\N	\N	\N	4	50000.00	6000.00	206000.00	CONFIRMED	card	\N	BK-B4EB7C37-F59E	\N	kim@parkgolf.com	김철수	\N	2026-01-06 07:08:32.591	2026-01-06 07:08:33.18	83	경기 파크골프장 281603-2	281603-G2	75	경기 파크골프장 281603-2 라운드	17019	38a2596c-2322-4035-95bc-390e9dc6ebca	\N
17	2026-01-10 00:00:00	06:24	09:23	299	경기 파크골프장 497261-2 - A코스	300	경기 파크골프장 497261-2 - B코스	22	\N	\N	\N	3	65000.00	5850.00	200850.00	CONFIRMED	naverpay	\N	BK-26587E13-0F4E	\N	kim@parkgolf.com	김철수	\N	2026-01-10 06:27:44.193	2026-01-10 06:27:44.687	133	경기 파크골프장 497261-2	497261-G2	125	경기 파크골프장 497261-2 라운드	34013	95ed9f77-597a-410c-9bcc-139400eac172	\N
19	2026-01-14 00:00:00	06:00	09:00	1	A 코스	2	B 코스	3	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	card	\N	BK-EB37EA8B-27BB	\N	test@parkgolf.com	테스트사용자	\N	2026-01-13 14:52:23.348	2026-01-13 14:53:06.849	\N	강남 파크골프 클럽	AB	1	A+B 코스	1387	99aac7cc-b0b7-4ad1-b9d5-d14052598239	\N
20	2026-01-14 00:00:00	06:00	09:00	1	A 코스	2	B 코스	3	\N	\N	\N	2	30000.00	1800.00	61800.00	FAILED	card	\N	BK-9494FDED-3598	\N	test@parkgolf.com	테스트사용자	\N	2026-01-13 15:09:34.248	2026-01-13 15:11:01.047	\N	강남 파크골프 클럽	AB	1	A+B 코스	1387	6978e18c-e22e-43b4-a63c-be83da375e73	Saga timeout - slot reservation not confirmed in time
23	2026-01-14 00:00:00	06:10	09:10	1	A 코스	2	B 코스	3	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	card	\N	BK-9D34652E-9A1B	\N	test@parkgolf.com	테스트사용자	\N	2026-01-13 15:18:08.188	2026-01-13 15:18:18.549	1	강남 파크골프 클럽	AB	1	A+B 코스	1388	2b886c13-e1b8-4437-b8f6-04bab466c215	\N
24	2026-01-14 00:00:00	06:10	09:10	1	A 코스	2	B 코스	3	\N	\N	\N	2	30000.00	1800.00	61800.00	FAILED	card	\N	BK-67EC284D-1F9C	\N	test@parkgolf.com	테스트사용자	\N	2026-01-13 15:48:53.347	2026-01-13 15:50:01.747	1	강남 파크골프 클럽	AB	1	A+B 코스	1388	a0c8ab75-7139-49a1-b2c0-7771ca0188a5	Saga timeout - slot reservation not confirmed in time
25	2026-01-15 00:00:00	06:00	09:00	1	A 코스	2	B 코스	3	\N	\N	\N	2	30000.00	1800.00	61800.00	FAILED	card	\N	BK-D4FF8DD0-8301	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 02:15:53.847	2026-01-14 02:17:01.256	1	강남 파크골프 클럽	AB	1	A+B 코스	1459	d251cf79-9eaa-4e3a-8ea9-b4cc4553f72a	Saga timeout - slot reservation not confirmed in time
27	2026-01-14 00:00:00	06:12	09:37	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	3	\N	\N	\N	3	40000.00	3600.00	123600.00	FAILED	card	\N	BK-230F275E-2D4A	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:03:19.662	2026-01-14 13:03:59.773	112	서울 파크골프장 721408-1	721408-G1	104	서울 파크골프장 721408-1 라운드	31130	a8f3ba78-b2a1-4012-bbdb-b756f06d97a1	Time slot is not available (status: FULLY_BOOKED)
26	2026-01-14 00:00:00	06:12	09:37	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	3	\N	\N	\N	3	40000.00	3600.00	123600.00	FAILED	card	\N	BK-FE714C9F-21E0	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:03:11.563	2026-01-14 13:05:01.263	112	서울 파크골프장 721408-1	721408-G1	104	서울 파크골프장 721408-1 라운드	31130	9bc0db37-7a53-4e94-a1e8-bd0219d9a181	Saga timeout - slot reservation not confirmed in time
30	2026-01-15 00:00:00	08:30	11:37	271	인천 파크골프장 325455-3 - A코스	272	인천 파크골프장 325455-3 - B코스	3	\N	\N	\N	3	30000.00	2700.00	92700.00	FAILED	naverpay	\N	BK-B383653B-E88B	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:06:02.97	2026-01-14 13:06:12.362	124	인천 파크골프장 325455-3	325455-G3	116	인천 파크골프장 325455-3 라운드	29672	4325348d-1b06-4492-ad29-c94ff0bcf13b	Time slot is not available (status: FULLY_BOOKED)
28	2026-01-15 00:00:00	08:30	11:37	271	인천 파크골프장 325455-3 - A코스	272	인천 파크골프장 325455-3 - B코스	3	\N	\N	\N	3	30000.00	2700.00	92700.00	FAILED	naverpay	\N	BK-EEDA3B94-7E9F	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:05:40.563	2026-01-14 13:07:00.962	124	인천 파크골프장 325455-3	325455-G3	116	인천 파크골프장 325455-3 라운드	29672	6ea19519-6904-46c3-95ee-b9c47fb50b7c	Saga timeout - slot reservation not confirmed in time
31	2026-01-23 00:00:00	15:15	18:11	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	3	\N	\N	\N	4	60000.00	7200.00	247200.00	FAILED	kakaopay	\N	BK-450D1287-BA98	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:24:11.565	2026-01-14 13:26:00.962	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	38615	a4cda55f-7def-4a41-83b7-af66af808243	Saga timeout - slot reservation not confirmed in time
32	2026-01-22 00:00:00	14:30	17:19	149	인천 파크골프장 281603-3 - A코스	150	인천 파크골프장 281603-3 - B코스	3	\N	\N	\N	3	30000.00	2700.00	92700.00	CONFIRMED	kakaopay	\N	BK-20CD9D9F-88A4	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:45:35.235	2026-01-14 13:46:05.265	84	인천 파크골프장 281603-3	281603-G3	76	인천 파크골프장 281603-3 라운드	19093	91b01adb-6f0d-4080-89e3-44f4fb239a38	\N
34	2026-01-22 00:00:00	14:30	17:19	149	인천 파크골프장 281603-3 - A코스	150	인천 파크골프장 281603-3 - B코스	3	\N	\N	\N	3	30000.00	2700.00	92700.00	FAILED	kakaopay	\N	BK-51A11468-BF64	\N	test@parkgolf.com	테스트사용자	\N	2026-01-14 13:46:05.274	2026-01-14 13:46:13.826	84	인천 파크골프장 281603-3	281603-G3	76	인천 파크골프장 281603-3 라운드	19093	5d52bdad-60f2-4bfc-960a-f87334fd8349	Time slot is not available (status: FULLY_BOOKED)
36	2026-01-23 00:00:00	13:03	15:59	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	4	\N	\N	\N	4	60000.00	7200.00	247200.00	CONFIRMED	tosspay	\N	BK-E63691AD-8E5D	\N	kim@parkgolf.com	김철수	\N	2026-01-14 14:23:44.426	2026-01-14 14:23:55.227	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	38603	f12a4178-0657-48ea-97a2-170ca2fa5beb	\N
37	2026-01-19 00:00:00	17:20	20:20	1	A 코스	2	B 코스	4	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	kakaopay	\N	BK-F067AD74-38F9	\N	kim@parkgolf.com	김철수	\N	2026-01-19 01:05:52.228	2026-01-19 01:06:17.827	1	강남 파크골프 클럽	AB	1	A+B 코스	1851	03bcdec9-d6c0-47b7-a3d2-5f5b83e8fe0d	\N
38	2026-01-26 00:00:00	16:24	19:02	147	경기 파크골프장 281603-2 - A코스	148	경기 파크골프장 281603-2 - B코스	6	\N	\N	\N	4	50000.00	6000.00	206000.00	CONFIRMED	naverpay	\N	BK-1FE9F4B4-78C9	\N	lee@parkgolf.com	이민수		2026-01-22 03:44:47.142	2026-01-22 03:44:53.312	83	경기 파크골프장 281603-2	281603-G2	75	경기 파크골프장 281603-2 라운드	17428	DEF36E1B-A868-4B80-BE76-672A872340E4	\N
41	2026-01-23 00:00:00	06:00	09:00	1	A 코스	2	B 코스	4	\N	\N	\N	2	30000.00	1800.00	61800.00	CONFIRMED	kakaopay	\N	BK-7BC4FAEE-C717	\N	kim@parkgolf.com	김철수	\N	2026-01-23 02:59:09.233	2026-01-23 02:59:21.728	1	강남 파크골프 클럽	AB	1	A+B 코스	2071	8533e0b8-2ee0-41c5-8009-e8057bfcd161	\N
42	2026-01-30 00:00:00	09:45	12:41	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	4	\N	\N	\N	4	60000.00	7200.00	247200.00	CONFIRMED	kakaopay	\N	BK-4E030885-18A9	\N	kim@parkgolf.com	김철수	01033334444	2026-01-27 05:58:38.126	2026-01-27 05:58:55.026	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	38952	decfb47c-5746-4a98-b651-b23b3187291e	\N
43	2026-01-30 00:00:00	09:45	12:41	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	4	\N	\N	\N	4	60000.00	7200.00	247200.00	FAILED	kakaopay	\N	BK-14180FE2-FBA2	\N	kim@parkgolf.com	김철수	01033334444	2026-01-27 05:58:46.126	2026-01-27 05:59:05.925	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	38952	2a050f8c-3075-43b3-b9b1-dad486b15888	Time slot is not available (status: FULLY_BOOKED)
44	2026-02-03 00:00:00	16:45	19:41	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	6	\N	\N	\N	4	60000.00	7200.00	247200.00	CONFIRMED	tosspay	\N	BK-6A65313D-CA29	\N	lee@parkgolf.com	이민수		2026-01-27 06:08:09.227	2026-01-27 06:08:21.826	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	39199	92E59D2E-6D16-44B0-9A8D-25322DCD664A	\N
45	2026-02-02 00:00:00	07:10	10:06	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	5	\N	\N	\N	4	60000.00	7200.00	247200.00	CONFIRMED	kakaopay	\N	BK-51D09713-6A10	\N	park@parkgolf.com	박영희		2026-01-28 14:29:23.814	2026-01-28 14:29:24.605	92	서울 파크골프장 972452-1	972452-G1	84	서울 파크골프장 972452-1 라운드	39091	2288132F-9A1B-49D0-8260-1AF3C5FD3E53	\N
46	2026-02-02 00:00:00	05:00	08:25	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	3	\N	\N	\N	2	40000.00	2400.00	82400.00	CONFIRMED	card	\N	BK-330ED879-B2D5	\N	test@parkgolf.com	테스트사용자	01011112222	2026-02-01 04:48:25.071	2026-02-01 04:48:25.259	112	서울 파크골프장 721408-1	721408-G1	104	서울 파크골프장 721408-1 라운드	33268	5fa90330-1f4f-4400-8196-7a148190cb00	\N
47	2026-02-02 00:00:00	05:00	08:25	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	3	\N	\N	\N	1	40000.00	1200.00	41200.00	CONFIRMED	card	\N	BK-B4154CBE-11A6	\N	test@parkgolf.com	테스트사용자	01011112222	2026-02-01 04:48:32.908	2026-02-01 04:48:33.021	112	서울 파크골프장 721408-1	721408-G1	104	서울 파크골프장 721408-1 라운드	33268	434b19cd-cab8-4885-9a8d-3fda45441621	\N
48	2026-02-02 00:00:00	05:08	08:33	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	3	\N	\N	\N	2	40000.00	2400.00	82400.00	CONFIRMED	card	\N	BK-81C2B335-33DC	\N	test@parkgolf.com	테스트사용자	01011112222	2026-02-01 04:48:40.707	2026-02-01 04:48:40.927	112	서울 파크골프장 721408-1	721408-G1	104	서울 파크골프장 721408-1 라운드	33269	8781b9e6-88ec-45e4-b4aa-92c6ab1e689d	\N
\.


--
-- Data for Name: cancellation_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cancellation_policies (id, name, code, description, allow_user_cancel, user_cancel_deadline_hours, allow_same_day_cancel, is_default, is_active, club_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: game_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.game_cache (id, game_id, name, code, description, front_nine_course_id, front_nine_course_name, back_nine_course_id, back_nine_course_name, total_holes, estimated_duration, break_duration, max_players, base_price, weekend_price, holiday_price, club_id, club_name, is_active, last_sync_at, created_at, updated_at) FROM stdin;
5	127	부산 파크골프장 497261-4 라운드	497261-G4	부산 파크골프장 497261-4의 부산 파크골프장 497261-4 라운드	304	부산 파크골프장 497261-4 - A코스	305	부산 파크골프장 497261-4 - B코스	18	154	5	4	40000.00	52000.00	60000.00	135	부산 파크골프장 497261-4	t	2026-01-05 12:31:09.915	2026-01-05 12:31:09.915	2026-01-05 12:31:09.915
6	133	강원 파크골프장 497261-10 라운드	497261-G10	강원 파크골프장 497261-10의 강원 파크골프장 497261-10 라운드	323	강원 파크골프장 497261-10 - A코스	324	강원 파크골프장 497261-10 - B코스	18	192	10	3	60000.00	78000.00	90000.00	141	강원 파크골프장 497261-10	t	2026-01-05 12:41:16.597	2026-01-05 12:41:16.597	2026-01-05 12:41:16.597
7	128	대구 파크골프장 497261-5 라운드	497261-G5	대구 파크골프장 497261-5의 대구 파크골프장 497261-5 라운드	306	대구 파크골프장 497261-5 - A코스	307	대구 파크골프장 497261-5 - B코스	18	197	13	3	50000.00	65000.00	75000.00	136	대구 파크골프장 497261-5	t	2026-01-05 12:48:53.613	2026-01-05 12:48:53.613	2026-01-05 12:48:53.613
8	74	서울 파크골프장 281603-1 라운드	281603-G1	서울 파크골프장 281603-1의 서울 파크골프장 281603-1 라운드	144	서울 파크골프장 281603-1 - A코스	145	서울 파크골프장 281603-1 - B코스	18	168	11	4	60000.00	78000.00	90000.00	82	서울 파크골프장 281603-1	t	2026-01-06 04:35:22.515	2026-01-06 04:35:22.515	2026-01-06 04:35:22.515
9	129	광주 파크골프장 497261-6 라운드	497261-G6	광주 파크골프장 497261-6의 광주 파크골프장 497261-6 라운드	309	광주 파크골프장 497261-6 - A코스	310	광주 파크골프장 497261-6 - B코스	18	195	15	4	40000.00	52000.00	60000.00	137	광주 파크골프장 497261-6	t	2026-01-06 05:08:29.018	2026-01-06 05:08:29.018	2026-01-06 05:08:29.018
13	125	경기 파크골프장 497261-2 라운드	497261-G2	경기 파크골프장 497261-2의 경기 파크골프장 497261-2 라운드	299	경기 파크골프장 497261-2 - A코스	300	경기 파크골프장 497261-2 - B코스	18	179	9	3	50000.00	65000.00	75000.00	133	경기 파크골프장 497261-2	t	2026-01-10 06:27:44.09	2026-01-10 06:27:44.09	2026-01-10 06:27:44.09
18	116	인천 파크골프장 325455-3 라운드	325455-G3	인천 파크골프장 325455-3의 인천 파크골프장 325455-3 라운드	271	인천 파크골프장 325455-3 - A코스	272	인천 파크골프장 325455-3 - B코스	18	187	14	3	30000.00	39000.00	45000.00	124	인천 파크골프장 325455-3	t	2026-01-14 13:05:37.163	2026-01-14 13:05:37.163	2026-01-14 13:05:37.163
20	76	인천 파크골프장 281603-3 라운드	281603-G3	인천 파크골프장 281603-3의 인천 파크골프장 281603-3 라운드	149	인천 파크골프장 281603-3 - A코스	150	인천 파크골프장 281603-3 - B코스	18	169	7	3	30000.00	39000.00	45000.00	84	인천 파크골프장 281603-3	t	2026-01-14 13:45:52.626	2026-01-14 13:45:26.527	2026-01-14 13:45:53.226
12	75	경기 파크골프장 281603-2 라운드	281603-G2	경기 파크골프장 281603-2의 경기 파크골프장 281603-2 라운드	147	경기 파크골프장 281603-2 - A코스	148	경기 파크골프장 281603-2 - B코스	18	158	11	4	50000.00	65000.00	75000.00	83	경기 파크골프장 281603-2	t	2026-01-22 03:44:42.075	2026-01-06 07:08:32.551	2026-01-22 03:44:42.145
1	1	A+B 코스	AB	A코스와 B코스를 결합한 18홀 코스	1	A 코스	2	B 코스	18	180	10	4	30000.00	40000.00	\N	1	강남 파크골프 클럽	t	2026-01-23 02:58:36.628	2025-12-23 06:41:48.981	2026-01-23 02:58:36.63
19	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1의 서울 파크골프장 972452-1 라운드	172	서울 파크골프장 972452-1 - A코스	173	서울 파크골프장 972452-1 - B코스	18	176	13	4	60000.00	78000.00	90000.00	92	서울 파크골프장 972452-1	t	2026-01-28 14:29:23.773	2026-01-14 13:24:08.362	2026-01-28 14:29:23.775
17	104	서울 파크골프장 721408-1 라운드	721408-G1	서울 파크골프장 721408-1의 서울 파크골프장 721408-1 라운드	235	서울 파크골프장 721408-1 - A코스	236	서울 파크골프장 721408-1 - B코스	18	205	5	3	40000.00	52000.00	60000.00	112	서울 파크골프장 721408-1	t	2026-02-01 04:48:40.685	2026-01-14 13:03:08.262	2026-02-01 04:48:40.687
\.


--
-- Data for Name: game_time_slot_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.game_time_slot_cache (id, game_time_slot_id, game_id, game_name, game_code, front_nine_course_name, back_nine_course_name, club_id, club_name, date, start_time, end_time, max_players, booked_players, available_players, is_available, price, is_premium, status, last_sync_at, created_at, updated_at) FROM stdin;
1	1	1	A+B 코스	G-001	코스 A	코스 B	1	강남 파크골프 클럽	2025-12-29	06:00	06:10	4	2	2	t	30000.00	f	AVAILABLE	2025-12-23 06:41:49.077	2025-12-23 06:41:49.077	2025-12-23 06:47:36.866
2	69	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2025-12-29	17:20	20:20	4	0	4	t	30000.00	f	AVAILABLE	2025-12-29 08:39:36.836	2025-12-29 08:39:36.836	2025-12-29 08:39:36.836
3	703	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-05	06:00	09:00	4	2	2	t	30000.00	f	AVAILABLE	2026-01-05 04:58:01.222	2026-01-05 04:57:25.622	2026-01-05 04:58:01.223
4	927	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-08	07:20	10:20	4	4	0	t	30000.00	f	AVAILABLE	2026-01-05 06:46:05.798	2026-01-05 06:45:54.937	2026-01-05 06:46:05.799
5	34790	127	부산 파크골프장 497261-4 라운드	497261-G4	부산 파크골프장 497261-4 - A코스	부산 파크골프장 497261-4 - B코스	135	부산 파크골프장 497261-4	2026-01-07	15:52	18:26	4	0	4	t	40000.00	f	AVAILABLE	2026-01-05 12:31:11.514	2026-01-05 12:31:11.514	2026-01-05 12:31:11.514
6	37505	133	강원 파크골프장 497261-10 라운드	497261-G10	강원 파크골프장 497261-10 - A코스	강원 파크골프장 497261-10 - B코스	141	강원 파크골프장 497261-10	2026-01-09	07:48	11:00	3	0	3	t	60000.00	f	AVAILABLE	2026-01-05 12:41:16.914	2026-01-05 12:41:16.914	2026-01-05 12:41:16.914
7	35258	128	대구 파크골프장 497261-5 라운드	497261-G5	대구 파크골프장 497261-5 - A코스	대구 파크골프장 497261-5 - B코스	136	대구 파크골프장 497261-5	2026-01-08	13:00	16:17	3	0	3	t	50000.00	f	AVAILABLE	2026-01-05 12:48:54.165	2026-01-05 12:48:54.165	2026-01-05 12:48:54.165
8	14997	74	서울 파크골프장 281603-1 라운드	281603-G1	서울 파크골프장 281603-1 - A코스	서울 파크골프장 281603-1 - B코스	82	서울 파크골프장 281603-1	2026-01-07	07:50	10:38	4	4	0	t	60000.00	f	AVAILABLE	2026-01-06 04:35:40.632	2026-01-06 04:35:23.014	2026-01-06 04:35:40.633
9	35623	129	광주 파크골프장 497261-6 라운드	497261-G6	광주 파크골프장 497261-6 - A코스	광주 파크골프장 497261-6 - B코스	137	광주 파크골프장 497261-6	2026-01-09	09:44	12:59	4	0	4	t	40000.00	f	AVAILABLE	2026-01-06 05:08:30.019	2026-01-06 05:08:30.019	2026-01-06 05:08:30.019
10	847	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-07	06:00	09:00	4	2	2	t	30000.00	f	AVAILABLE	2026-01-06 05:46:52.238	2026-01-06 05:46:26.748	2026-01-06 05:46:52.239
11	848	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-07	06:10	09:10	4	2	2	t	30000.00	f	AVAILABLE	2026-01-06 06:47:33.03	2026-01-06 06:04:19.742	2026-01-06 06:47:33.031
12	17019	75	경기 파크골프장 281603-2 라운드	281603-G2	경기 파크골프장 281603-2 - A코스	경기 파크골프장 281603-2 - B코스	83	경기 파크골프장 281603-2	2026-01-15	10:12	12:50	4	4	0	t	50000.00	f	AVAILABLE	2026-01-06 07:08:33.193	2026-01-06 07:08:32.564	2026-01-06 07:08:33.194
13	34013	125	경기 파크골프장 497261-2 라운드	497261-G2	경기 파크골프장 497261-2 - A코스	경기 파크골프장 497261-2 - B코스	133	경기 파크골프장 497261-2	2026-01-10	06:24	09:23	3	3	0	t	65000.00	t	AVAILABLE	2026-01-10 06:27:44.703	2026-01-10 06:27:44.162	2026-01-10 06:27:44.704
14	1387	1	A+B 코스	AB	A 코스	B 코스	\N	강남 파크골프 클럽	2026-01-14	06:00	09:00	4	2	2	t	30000.00	f	AVAILABLE	2026-01-13 14:53:08.011	2026-01-13 14:34:44.547	2026-01-13 14:53:08.011
25	1851	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-19	17:20	20:20	4	4	0	t	30000.00	f	AVAILABLE	2026-01-19 01:06:17.842	2026-01-19 01:05:50.129	2026-01-19 01:06:17.843
15	1388	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-14	06:10	09:10	4	2	2	t	30000.00	f	AVAILABLE	2026-01-13 15:18:21.347	2026-01-13 15:10:17.548	2026-01-13 15:18:21.547
17	1459	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-15	06:00	09:00	4	0	4	t	30000.00	f	AVAILABLE	2026-01-14 02:15:50.95	2026-01-14 02:15:50.95	2026-01-14 02:15:50.95
18	31130	104	서울 파크골프장 721408-1 라운드	721408-G1	서울 파크골프장 721408-1 - A코스	서울 파크골프장 721408-1 - B코스	112	서울 파크골프장 721408-1	2026-01-14	06:12	09:37	3	0	3	t	40000.00	f	AVAILABLE	2026-01-14 13:03:09.062	2026-01-14 13:03:09.062	2026-01-14 13:03:09.062
19	29672	116	인천 파크골프장 325455-3 라운드	325455-G3	인천 파크골프장 325455-3 - A코스	인천 파크골프장 325455-3 - B코스	124	인천 파크골프장 325455-3	2026-01-15	08:30	11:37	3	0	3	t	30000.00	f	AVAILABLE	2026-01-14 13:05:37.863	2026-01-14 13:05:37.863	2026-01-14 13:05:37.863
20	38615	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-01-23	15:15	18:11	4	0	4	t	60000.00	f	AVAILABLE	2026-01-14 13:24:09.563	2026-01-14 13:24:09.563	2026-01-14 13:24:09.563
21	19093	76	인천 파크골프장 281603-3 라운드	281603-G3	인천 파크골프장 281603-3 - A코스	인천 파크골프장 281603-3 - B코스	84	인천 파크골프장 281603-3	2026-01-22	14:30	17:19	3	3	0	t	30000.00	f	AVAILABLE	2026-01-14 13:46:05.314	2026-01-14 13:45:31.326	2026-01-14 13:46:05.315
23	38905	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-01-29	10:00	12:56	4	0	4	t	60000.00	f	AVAILABLE	2026-01-14 14:03:41.226	2026-01-14 14:03:41.226	2026-01-14 14:03:41.226
24	38603	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-01-23	13:03	15:59	4	4	0	t	60000.00	f	AVAILABLE	2026-01-14 14:23:57.126	2026-01-14 14:23:39.626	2026-01-14 14:23:57.328
29	39199	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-02-03	16:45	19:41	4	4	0	t	60000.00	f	AVAILABLE	2026-01-27 06:08:23.826	2026-01-27 06:08:06.527	2026-01-27 06:08:24.036
26	17428	75	경기 파크골프장 281603-2 라운드	281603-G2	경기 파크골프장 281603-2 - A코스	경기 파크골프장 281603-2 - B코스	83	경기 파크골프장 281603-2	2026-01-26	16:24	19:02	4	4	0	t	50000.00	f	AVAILABLE	2026-01-22 03:44:55.211	2026-01-22 03:44:43.512	2026-01-22 03:44:55.213
27	2071	1	A+B 코스	AB	A 코스	B 코스	1	강남 파크골프 클럽	2026-01-23	06:00	09:00	4	2	2	t	30000.00	f	AVAILABLE	2026-01-23 02:59:24.729	2026-01-23 02:58:37.929	2026-01-23 02:59:25.028
28	38952	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-01-30	09:45	12:41	4	4	0	t	60000.00	f	AVAILABLE	2026-01-27 05:58:56.382	2026-01-27 05:58:34.426	2026-01-27 05:58:56.383
30	39091	84	서울 파크골프장 972452-1 라운드	972452-G1	서울 파크골프장 972452-1 - A코스	서울 파크골프장 972452-1 - B코스	92	서울 파크골프장 972452-1	2026-02-02	07:10	10:06	4	4	0	t	60000.00	f	AVAILABLE	2026-01-28 14:29:24.616	2026-01-28 14:29:23.79	2026-01-28 14:29:24.617
31	33268	104	서울 파크골프장 721408-1 라운드	721408-G1	서울 파크골프장 721408-1 - A코스	서울 파크골프장 721408-1 - B코스	112	서울 파크골프장 721408-1	2026-02-02	05:00	08:25	3	3	0	t	40000.00	f	AVAILABLE	2026-02-01 04:48:33.028	2026-02-01 04:48:25.053	2026-02-01 04:48:33.029
32	33269	104	서울 파크골프장 721408-1 라운드	721408-G1	서울 파크골프장 721408-1 - A코스	서울 파크골프장 721408-1 - B코스	112	서울 파크골프장 721408-1	2026-02-02	05:08	08:33	3	2	1	t	40000.00	f	AVAILABLE	2026-02-01 04:48:40.934	2026-02-01 04:48:40.693	2026-02-01 04:48:40.935
\.


--
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.idempotency_keys (id, key, aggregate_type, aggregate_id, response_status, response_body, created_at, expires_at) FROM stdin;
3	1a145922-285f-402f-8eca-3a9dd6a070a9	Booking	4	\N	\N	2026-01-05 04:57:31.197	2026-01-06 04:57:28.951
4	7f2f8a26-2a63-4d22-9602-8954b1c122bd	Booking	5	\N	\N	2026-01-05 04:58:01.19	2026-01-06 04:57:57.621
5	6209cc2a-674f-4cc1-82f7-f4a7e3c390ef	Booking	6	\N	\N	2026-01-05 06:45:58.837	2026-01-06 06:45:56.64
6	1491e6a4-e4c1-4720-9a11-03e11a005b7f	Booking	7	\N	\N	2026-01-05 12:31:17.014	2026-01-06 12:31:14.413
7	f8e6bf64-400b-485a-85fa-4ae53fdbaa54	Booking	8	\N	\N	2026-01-05 12:31:35.338	2026-01-06 12:31:35.323
8	8cf6de08-f546-4291-a89c-cd8e8dc941f7	Booking	9	\N	\N	2026-01-06 04:35:27.014	2026-01-07 04:35:25.234
9	8fb0f808-f9f8-47e0-a5c9-88229c76b8f8	Booking	10	\N	\N	2026-01-06 05:08:33.231	2026-01-07 05:08:31.218
11	89590b5c-d71d-468b-aedb-bbe41ed0b4cf	Booking	12	\N	\N	2026-01-06 05:09:16.53	2026-01-07 05:09:15.118
12	89001c5d-8a11-406c-bd59-89eaa1efc894	Booking	13	\N	\N	2026-01-06 05:46:31.05	2026-01-07 05:46:28.649
13	7f93aac3-f712-4813-a074-9974f4b5f1e8	Booking	14	\N	\N	2026-01-06 06:04:25.743	2026-01-07 06:04:22.242
14	7455a66d-a25b-47dd-8905-2842b7961643	Booking	15	\N	\N	2026-01-06 06:47:03.061	2026-01-07 06:47:03.037
15	38a2596c-2322-4035-95bc-390e9dc6ebca	Booking	16	\N	\N	2026-01-06 07:08:32.606	2026-01-07 07:08:32.585
16	95ed9f77-597a-410c-9bcc-139400eac172	Booking	17	\N	\N	2026-01-10 06:27:44.222	2026-01-11 06:27:44.183
17	99aac7cc-b0b7-4ad1-b9d5-d14052598239	Booking	19	\N	\N	2026-01-13 14:52:25.747	2026-01-14 14:52:22.648
18	6978e18c-e22e-43b4-a63c-be83da375e73	Booking	20	\N	\N	2026-01-13 15:09:36.348	2026-01-14 15:09:33.947
19	2b886c13-e1b8-4437-b8f6-04bab466c215	Booking	23	\N	\N	2026-01-13 15:18:08.204	2026-01-14 15:18:08.182
20	a0c8ab75-7139-49a1-b2c0-7771ca0188a5	Booking	24	\N	\N	2026-01-13 15:48:55.347	2026-01-14 15:48:52.547
21	d251cf79-9eaa-4e3a-8ea9-b4cc4553f72a	Booking	25	\N	\N	2026-01-14 02:15:55.648	2026-01-15 02:15:53.147
22	9bc0db37-7a53-4e94-a1e8-bd0219d9a181	Booking	26	\N	\N	2026-01-14 13:03:13.461	2026-01-15 13:03:10.462
23	a8f3ba78-b2a1-4012-bbdb-b756f06d97a1	Booking	27	\N	\N	2026-01-14 13:03:21.692	2026-01-15 13:03:18.665
24	6ea19519-6904-46c3-95ee-b9c47fb50b7c	Booking	28	\N	\N	2026-01-14 13:05:41.762	2026-01-15 13:05:39.963
26	4325348d-1b06-4492-ad29-c94ff0bcf13b	Booking	30	\N	\N	2026-01-14 13:06:02.985	2026-01-15 13:06:02.963
27	a4cda55f-7def-4a41-83b7-af66af808243	Booking	31	\N	\N	2026-01-14 13:24:12.762	2026-01-15 13:24:11.362
28	91b01adb-6f0d-4080-89e3-44f4fb239a38	Booking	32	\N	\N	2026-01-14 13:45:35.257	2026-01-15 13:45:35.224
29	5d52bdad-60f2-4bfc-960a-f87334fd8349	Booking	34	\N	\N	2026-01-14 13:46:05.308	2026-01-15 13:46:05.257
31	f12a4178-0657-48ea-97a2-170ca2fa5beb	Booking	36	\N	\N	2026-01-14 14:23:46.626	2026-01-15 14:23:43.525
32	03bcdec9-d6c0-47b7-a3d2-5f5b83e8fe0d	Booking	37	\N	\N	2026-01-19 01:05:53.958	2026-01-20 01:05:51.427
33	DEF36E1B-A868-4B80-BE76-672A872340E4	Booking	38	\N	\N	2026-01-22 03:44:48.613	2026-01-23 03:44:46.112
35	8533e0b8-2ee0-41c5-8009-e8057bfcd161	Booking	41	\N	\N	2026-01-23 02:59:10.929	2026-01-24 02:59:08.639
36	decfb47c-5746-4a98-b651-b23b3187291e	Booking	42	\N	\N	2026-01-27 05:58:40.226	2026-01-28 05:58:36.625
37	2a050f8c-3075-43b3-b9b1-dad486b15888	Booking	43	\N	\N	2026-01-27 05:58:47.426	2026-01-28 05:58:45.825
38	92E59D2E-6D16-44B0-9A8D-25322DCD664A	Booking	44	\N	\N	2026-01-27 06:08:11.726	2026-01-28 06:08:08.825
39	2288132F-9A1B-49D0-8260-1AF3C5FD3E53	Booking	45	\N	\N	2026-01-28 14:29:23.864	2026-01-29 14:29:23.807
40	5fa90330-1f4f-4400-8196-7a148190cb00	Booking	46	\N	\N	2026-02-01 04:48:25.08	2026-02-02 04:48:25.066
41	434b19cd-cab8-4885-9a8d-3fda45441621	Booking	47	\N	\N	2026-02-01 04:48:32.915	2026-02-02 04:48:32.905
42	8781b9e6-88ec-45e4-b4aa-92c6ab1e689d	Booking	48	\N	\N	2026-02-01 04:48:40.753	2026-02-02 04:48:40.701
\.


--
-- Data for Name: noshow_penalties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.noshow_penalties (id, noshow_policy_id, min_count, max_count, penalty_type, restriction_days, fee_amount, fee_rate, label, message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: noshow_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.noshow_policies (id, name, code, description, allow_refund_on_noshow, noshow_grace_minutes, count_reset_days, is_default, is_active, club_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, last_error, created_at, processed_at) FROM stdin;
12	Booking	13	slot.reserve	{"bookingId": 13, "playerCount": 2, "requestedAt": "2026-01-06T05:46:30.249Z", "bookingNumber": "BK-25BB73EA-ECF3", "gameTimeSlotId": 847}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-06 05:46:30.448	\N
4	Booking	5	slot.reserve	{"bookingId": 5, "playerCount": 2, "requestedAt": "2026-01-05T04:58:00.020Z", "bookingNumber": "BK-8A41973F-E318", "gameTimeSlotId": 703}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-05 04:58:00.12	\N
6	Booking	7	slot.reserve	{"bookingId": 7, "playerCount": 4, "requestedAt": "2026-01-05T12:31:16.313Z", "bookingNumber": "BK-C5325A8B-4C35", "gameTimeSlotId": 34790}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-05 12:31:16.314	\N
7	Booking	8	slot.reserve	{"bookingId": 8, "playerCount": 4, "requestedAt": "2026-01-05T12:31:35.333Z", "bookingNumber": "BK-1FE5F3B8-41C4", "gameTimeSlotId": 34790}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-05 12:31:35.334	\N
11	Booking	12	slot.reserve	{"bookingId": 12, "playerCount": 4, "requestedAt": "2026-01-06T05:09:16.018Z", "bookingNumber": "BK-EE986E59-A98C", "gameTimeSlotId": 35623}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-06 05:09:16.119	\N
32	Booking	34	slot.reserve	{"bookingId": 34, "playerCount": 3, "requestedAt": "2026-01-14T13:46:05.288Z", "bookingNumber": "BK-51A11468-BF64", "gameTimeSlotId": 19093}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-14 13:46:05.296	\N
40	Booking	42	slot.reserve	{"bookingId": 42, "playerCount": 4, "requestedAt": "2026-01-27T05:58:39.026Z", "bookingNumber": "BK-4E030885-18A9", "gameTimeSlotId": 38952}	SENT	0	\N	2026-01-27 05:58:39.326	2026-01-27 05:58:51.308
26	Booking	27	slot.reserve	{"bookingId": 27, "playerCount": 3, "requestedAt": "2026-01-14T13:03:21.062Z", "bookingNumber": "BK-230F275E-2D4A", "gameTimeSlotId": 31130}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-14 13:03:21.063	\N
41	Booking	43	slot.reserve	{"bookingId": 43, "playerCount": 4, "requestedAt": "2026-01-27T05:58:46.725Z", "bookingNumber": "BK-14180FE2-FBA2", "gameTimeSlotId": 38952}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-27 05:58:46.825	\N
42	Booking	44	slot.reserve	{"bookingId": 44, "playerCount": 4, "requestedAt": "2026-01-27T06:08:10.137Z", "bookingNumber": "BK-6A65313D-CA29", "gameTimeSlotId": 39199}	SENT	0	\N	2026-01-27 06:08:10.426	2026-01-27 06:08:19.209
29	Booking	30	slot.reserve	{"bookingId": 30, "playerCount": 3, "requestedAt": "2026-01-14T13:06:02.978Z", "bookingNumber": "BK-B383653B-E88B", "gameTimeSlotId": 29672}	FAILED	5	Time slot is not available (status: FULLY_BOOKED)	2026-01-14 13:06:02.979	\N
43	Booking	45	slot.reserve	{"bookingId": 45, "playerCount": 4, "requestedAt": "2026-01-28T14:29:23.821Z", "bookingNumber": "BK-51D09713-6A10", "gameTimeSlotId": 39091}	SENT	0	\N	2026-01-28 14:29:23.823	2026-01-28 14:29:24.574
44	Booking	46	slot.reserve	{"bookingId": 46, "playerCount": 2, "requestedAt": "2026-02-01T04:48:25.075Z", "bookingNumber": "BK-330ED879-B2D5", "gameTimeSlotId": 33268}	SENT	0	\N	2026-02-01 04:48:25.077	2026-02-01 04:48:25.205
45	Booking	47	slot.reserve	{"bookingId": 47, "playerCount": 1, "requestedAt": "2026-02-01T04:48:32.911Z", "bookingNumber": "BK-B4154CBE-11A6", "gameTimeSlotId": 33268}	SENT	0	\N	2026-02-01 04:48:32.912	2026-02-01 04:48:33.012
46	Booking	48	slot.reserve	{"bookingId": 48, "playerCount": 2, "requestedAt": "2026-02-01T04:48:40.710Z", "bookingNumber": "BK-81C2B335-33DC", "gameTimeSlotId": 33269}	SENT	0	\N	2026-02-01 04:48:40.711	2026-02-01 04:48:40.921
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, booking_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refund_policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refund_policies (id, name, code, description, admin_cancel_refund_rate, system_cancel_refund_rate, min_refund_amount, refund_fee, refund_fee_rate, is_default, is_active, club_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refund_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refund_tiers (id, refund_policy_id, min_hours_before, max_hours_before, refund_rate, label, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refunds (id, booking_id, payment_id, original_amount, refund_amount, refund_rate, refund_fee, status, cancellation_type, cancel_reason, cancelled_by, cancelled_by_type, pg_transaction_id, pg_refund_id, processed_at, processed_by, rejected_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_noshow_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_noshow_records (id, user_id, booking_id, noshow_at, processed_by, notes, is_reset, reset_at, reset_by, reset_reason, created_at) FROM stdin;
\.


--
-- Name: booking_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.booking_history_id_seq', 114, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 48, true);


--
-- Name: cancellation_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cancellation_policies_id_seq', 1, false);


--
-- Name: game_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.game_cache_id_seq', 31, true);


--
-- Name: game_time_slot_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.game_time_slot_cache_id_seq', 32, true);


--
-- Name: idempotency_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.idempotency_keys_id_seq', 42, true);


--
-- Name: noshow_penalties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.noshow_penalties_id_seq', 1, false);


--
-- Name: noshow_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.noshow_policies_id_seq', 1, false);


--
-- Name: outbox_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.outbox_events_id_seq', 46, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: refund_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refund_policies_id_seq', 1, false);


--
-- Name: refund_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refund_tiers_id_seq', 1, false);


--
-- Name: refunds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refunds_id_seq', 1, false);


--
-- Name: user_noshow_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_noshow_records_id_seq', 1, false);


--
-- Name: booking_history booking_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_history
    ADD CONSTRAINT booking_history_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: cancellation_policies cancellation_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancellation_policies
    ADD CONSTRAINT cancellation_policies_pkey PRIMARY KEY (id);


--
-- Name: game_cache game_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_cache
    ADD CONSTRAINT game_cache_pkey PRIMARY KEY (id);


--
-- Name: game_time_slot_cache game_time_slot_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_time_slot_cache
    ADD CONSTRAINT game_time_slot_cache_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: noshow_penalties noshow_penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noshow_penalties
    ADD CONSTRAINT noshow_penalties_pkey PRIMARY KEY (id);


--
-- Name: noshow_policies noshow_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noshow_policies
    ADD CONSTRAINT noshow_policies_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: refund_policies refund_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_policies
    ADD CONSTRAINT refund_policies_pkey PRIMARY KEY (id);


--
-- Name: refund_tiers refund_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_tiers
    ADD CONSTRAINT refund_tiers_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: user_noshow_records user_noshow_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_noshow_records
    ADD CONSTRAINT user_noshow_records_pkey PRIMARY KEY (id);


--
-- Name: booking_history_booking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_history_booking_id_idx ON public.booking_history USING btree (booking_id);


--
-- Name: bookings_booking_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_booking_date_idx ON public.bookings USING btree (booking_date);


--
-- Name: bookings_booking_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_booking_number_idx ON public.bookings USING btree (booking_number);


--
-- Name: bookings_booking_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bookings_booking_number_key ON public.bookings USING btree (booking_number);


--
-- Name: bookings_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_club_id_idx ON public.bookings USING btree (club_id);


--
-- Name: bookings_front_nine_course_id_back_nine_course_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_front_nine_course_id_back_nine_course_id_idx ON public.bookings USING btree (front_nine_course_id, back_nine_course_id);


--
-- Name: bookings_game_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_game_id_idx ON public.bookings USING btree (game_id);


--
-- Name: bookings_game_time_slot_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_game_time_slot_id_idx ON public.bookings USING btree (game_time_slot_id);


--
-- Name: bookings_idempotency_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bookings_idempotency_key_key ON public.bookings USING btree (idempotency_key);


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: bookings_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_user_id_idx ON public.bookings USING btree (user_id);


--
-- Name: cancellation_policies_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancellation_policies_club_id_idx ON public.cancellation_policies USING btree (club_id);


--
-- Name: cancellation_policies_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cancellation_policies_code_key ON public.cancellation_policies USING btree (code);


--
-- Name: cancellation_policies_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancellation_policies_is_active_idx ON public.cancellation_policies USING btree (is_active);


--
-- Name: cancellation_policies_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancellation_policies_is_default_idx ON public.cancellation_policies USING btree (is_default);


--
-- Name: game_cache_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_cache_club_id_idx ON public.game_cache USING btree (club_id);


--
-- Name: game_cache_game_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX game_cache_game_id_key ON public.game_cache USING btree (game_id);


--
-- Name: game_time_slot_cache_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_club_id_idx ON public.game_time_slot_cache USING btree (club_id);


--
-- Name: game_time_slot_cache_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_date_idx ON public.game_time_slot_cache USING btree (date);


--
-- Name: game_time_slot_cache_date_start_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_date_start_time_idx ON public.game_time_slot_cache USING btree (date, start_time);


--
-- Name: game_time_slot_cache_game_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_game_id_idx ON public.game_time_slot_cache USING btree (game_id);


--
-- Name: game_time_slot_cache_game_time_slot_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX game_time_slot_cache_game_time_slot_id_key ON public.game_time_slot_cache USING btree (game_time_slot_id);


--
-- Name: game_time_slot_cache_is_available_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_is_available_idx ON public.game_time_slot_cache USING btree (is_available);


--
-- Name: game_time_slot_cache_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX game_time_slot_cache_status_idx ON public.game_time_slot_cache USING btree (status);


--
-- Name: idempotency_keys_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idempotency_keys_expires_at_idx ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idempotency_keys_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idempotency_keys_key_idx ON public.idempotency_keys USING btree (key);


--
-- Name: idempotency_keys_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idempotency_keys_key_key ON public.idempotency_keys USING btree (key);


--
-- Name: noshow_penalties_noshow_policy_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX noshow_penalties_noshow_policy_id_idx ON public.noshow_penalties USING btree (noshow_policy_id);


--
-- Name: noshow_policies_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX noshow_policies_club_id_idx ON public.noshow_policies USING btree (club_id);


--
-- Name: noshow_policies_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX noshow_policies_code_key ON public.noshow_policies USING btree (code);


--
-- Name: noshow_policies_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX noshow_policies_is_active_idx ON public.noshow_policies USING btree (is_active);


--
-- Name: noshow_policies_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX noshow_policies_is_default_idx ON public.noshow_policies USING btree (is_default);


--
-- Name: outbox_events_aggregate_type_aggregate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_events_aggregate_type_aggregate_id_idx ON public.outbox_events USING btree (aggregate_type, aggregate_id);


--
-- Name: outbox_events_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_events_status_created_at_idx ON public.outbox_events USING btree (status, created_at);


--
-- Name: refund_policies_club_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_policies_club_id_idx ON public.refund_policies USING btree (club_id);


--
-- Name: refund_policies_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refund_policies_code_key ON public.refund_policies USING btree (code);


--
-- Name: refund_policies_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_policies_is_active_idx ON public.refund_policies USING btree (is_active);


--
-- Name: refund_policies_is_default_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_policies_is_default_idx ON public.refund_policies USING btree (is_default);


--
-- Name: refund_tiers_refund_policy_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_tiers_refund_policy_id_idx ON public.refund_tiers USING btree (refund_policy_id);


--
-- Name: refunds_booking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refunds_booking_id_idx ON public.refunds USING btree (booking_id);


--
-- Name: refunds_cancellation_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refunds_cancellation_type_idx ON public.refunds USING btree (cancellation_type);


--
-- Name: refunds_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refunds_payment_id_idx ON public.refunds USING btree (payment_id);


--
-- Name: refunds_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refunds_status_idx ON public.refunds USING btree (status);


--
-- Name: user_noshow_records_booking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_noshow_records_booking_id_idx ON public.user_noshow_records USING btree (booking_id);


--
-- Name: user_noshow_records_noshow_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_noshow_records_noshow_at_idx ON public.user_noshow_records USING btree (noshow_at);


--
-- Name: user_noshow_records_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_noshow_records_user_id_idx ON public.user_noshow_records USING btree (user_id);


--
-- Name: booking_history booking_history_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_history
    ADD CONSTRAINT booking_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: noshow_penalties noshow_penalties_noshow_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noshow_penalties
    ADD CONSTRAINT noshow_penalties_noshow_policy_id_fkey FOREIGN KEY (noshow_policy_id) REFERENCES public.noshow_policies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refund_tiers refund_tiers_refund_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_tiers
    ADD CONSTRAINT refund_tiers_refund_policy_id_fkey FOREIGN KEY (refund_policy_id) REFERENCES public.refund_policies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict sL9WFCCFps8JvL0P1GBojO6YzueNPtnjMvgWjIdE8P1sr5ve16IW3YoTWwip3LL

