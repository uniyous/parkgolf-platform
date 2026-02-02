--
-- PostgreSQL database dump
--

\restrict OgB4T0885QrbGNvYFcwz21iw92SGwV9Cmc5SLPNSbLXeFT4Bnhh0YbX3ZGvGOre

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
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'READ'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'FRIEND_REQUEST',
    'FRIEND_ACCEPTED',
    'CHAT_MESSAGE',
    'SYSTEM_ALERT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dead_letter_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dead_letter_notifications (
    id integer NOT NULL,
    original_id integer NOT NULL,
    user_id text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    delivery_channel text,
    failure_reason text NOT NULL,
    retry_count integer NOT NULL,
    moved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: dead_letter_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dead_letter_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dead_letter_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dead_letter_notifications_id_seq OWNED BY public.dead_letter_notifications.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    user_id text NOT NULL,
    email boolean DEFAULT true NOT NULL,
    sms boolean DEFAULT false NOT NULL,
    push boolean DEFAULT true NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id integer NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL,
    delivery_channel text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    scheduled_at timestamp(3) without time zone,
    sent_at timestamp(3) without time zone,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: dead_letter_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dead_letter_notifications ALTER COLUMN id SET DEFAULT nextval('public.dead_letter_notifications_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Data for Name: dead_letter_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dead_letter_notifications (id, original_id, user_id, type, title, message, data, delivery_channel, failure_reason, retry_count, moved_at) FROM stdin;
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_settings (id, user_id, email, sms, push, marketing, created_at, updated_at) FROM stdin;
1	999	t	f	t	f	2026-01-28 02:50:21.675	2026-01-28 02:50:21.675
2	5	t	f	t	f	2026-01-28 14:29:24.719	2026-01-28 14:29:24.719
3	3	t	f	t	f	2026-02-01 04:48:25.312	2026-02-01 04:48:25.312
4	4	t	f	t	f	2026-02-01 06:32:20.448	2026-02-01 06:32:20.448
5	6	t	f	t	f	2026-02-02 03:46:54.992	2026-02-02 03:46:54.992
6	21	t	f	t	f	2026-02-02 03:47:16.677	2026-02-02 03:47:16.677
7	20	t	f	t	f	2026-02-02 06:15:56.329	2026-02-02 06:15:56.329
8	22	t	f	t	f	2026-02-02 06:16:51.097	2026-02-02 06:16:51.097
9	23	t	f	t	f	2026-02-02 06:17:41.452	2026-02-02 06:17:41.452
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_templates (id, type, title, content, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, data, status, delivery_channel, retry_count, max_retries, scheduled_at, sent_at, read_at, created_at, updated_at) FROM stdin;
2	3	SYSTEM_ALERT	알림 1	테스트 메시지 1	\N	READ	\N	0	3	\N	\N	2026-01-27 04:45:52.037	2026-01-27 04:45:51.74	2026-01-27 04:45:52.038
3	3	SYSTEM_ALERT	알림 2	테스트 메시지 2	\N	READ	\N	0	3	\N	\N	2026-01-27 04:45:52.037	2026-01-27 04:45:51.835	2026-01-27 04:45:52.038
4	3	SYSTEM_ALERT	알림 3	테스트 메시지 3	\N	READ	\N	0	3	\N	\N	2026-01-27 04:45:52.037	2026-01-27 04:45:51.936	2026-01-27 04:45:52.038
9	5	BOOKING_CONFIRMED	예약이 확정되었습니다	서울 파크골프장 972452-1 라운드에서 2026-02-02T00:00:00.000Z 07:10 예약이 확정되었습니다.	{"gameId": 84, "gameName": "서울 파크골프장 972452-1 라운드", "timeSlot": "07:10", "bookingId": 45, "bookingDate": "2026-02-02T00:00:00.000Z", "bookingNumber": "BK-51D09713-6A10"}	SENT	PUSH	0	3	\N	2026-01-28 14:29:24.78	\N	2026-01-28 14:29:24.688	2026-01-28 14:29:24.781
10	3	BOOKING_CONFIRMED	예약이 확정되었습니다	서울 파크골프장 721408-1 라운드에서 2026-02-02T00:00:00.000Z 05:00 예약이 확정되었습니다.	{"gameId": 104, "gameName": "서울 파크골프장 721408-1 라운드", "timeSlot": "05:00", "bookingId": 46, "bookingDate": "2026-02-02T00:00:00.000Z", "bookingNumber": "BK-330ED879-B2D5"}	SENT	PUSH	0	3	\N	2026-02-01 04:48:25.344	\N	2026-02-01 04:48:25.294	2026-02-01 04:48:25.345
11	3	BOOKING_CONFIRMED	예약이 확정되었습니다	서울 파크골프장 721408-1 라운드에서 2026-02-02T00:00:00.000Z 05:00 예약이 확정되었습니다.	{"gameId": 104, "gameName": "서울 파크골프장 721408-1 라운드", "timeSlot": "05:00", "bookingId": 47, "bookingDate": "2026-02-02T00:00:00.000Z", "bookingNumber": "BK-B4154CBE-11A6"}	SENT	PUSH	0	3	\N	2026-02-01 04:48:33.092	\N	2026-02-01 04:48:33.078	2026-02-01 04:48:33.093
12	3	BOOKING_CONFIRMED	예약이 확정되었습니다	서울 파크골프장 721408-1 라운드에서 2026-02-02T00:00:00.000Z 05:08 예약이 확정되었습니다.	{"gameId": 104, "gameName": "서울 파크골프장 721408-1 라운드", "timeSlot": "05:08", "bookingId": 48, "bookingDate": "2026-02-02T00:00:00.000Z", "bookingNumber": "BK-81C2B335-33DC"}	SENT	PUSH	0	3	\N	2026-02-01 04:48:40.961	\N	2026-02-01 04:48:40.945	2026-02-01 04:48:40.962
13	4	FRIEND_REQUEST	박영희님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 6, "fromUserId": 5, "fromUserName": "박영희"}	SENT	PUSH	0	3	\N	2026-02-01 06:32:20.485	\N	2026-02-01 06:32:20.379	2026-02-01 06:32:20.486
14	5	FRIEND_ACCEPTED	친구 요청이 수락되었습니다	김철수님과 친구가 되었습니다.	{"friendId": 4, "requestId": 6, "friendName": "김철수"}	SENT	PUSH	0	3	\N	2026-02-01 06:32:49.24	\N	2026-02-01 06:32:49.227	2026-02-01 06:32:49.241
15	4	FRIEND_REQUEST	김민수님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 7, "fromUserId": 20, "fromUserName": "김민수"}	SENT	PUSH	0	3	\N	2026-02-02 03:46:49.938	\N	2026-02-02 03:46:49.852	2026-02-02 03:46:49.939
16	6	FRIEND_REQUEST	김민수님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 8, "fromUserId": 20, "fromUserName": "김민수"}	SENT	PUSH	0	3	\N	2026-02-02 03:46:55.002	\N	2026-02-02 03:46:54.986	2026-02-02 03:46:55.003
17	5	FRIEND_REQUEST	김민수님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 9, "fromUserId": 20, "fromUserName": "김민수"}	SENT	PUSH	0	3	\N	2026-02-02 03:47:07.327	\N	2026-02-02 03:47:07.31	2026-02-02 03:47:07.328
18	21	FRIEND_REQUEST	김민수님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 10, "fromUserId": 20, "fromUserName": "김민수"}	SENT	PUSH	0	3	\N	2026-02-02 03:47:16.685	\N	2026-02-02 03:47:16.673	2026-02-02 03:47:16.686
19	20	FRIEND_ACCEPTED	친구 요청이 수락되었습니다	이지은님과 친구가 되었습니다.	{"friendId": 21, "requestId": 10, "friendName": "이지은"}	SENT	PUSH	0	3	\N	2026-02-02 06:15:56.426	\N	2026-02-02 06:15:56.301	2026-02-02 06:15:56.427
20	21	FRIEND_REQUEST	최서연님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 11, "fromUserId": 23, "fromUserName": "최서연"}	SENT	PUSH	0	3	\N	2026-02-02 06:16:11.326	\N	2026-02-02 06:16:11.303	2026-02-02 06:16:11.329
21	22	FRIEND_REQUEST	최서연님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 12, "fromUserId": 23, "fromUserName": "최서연"}	SENT	PUSH	0	3	\N	2026-02-02 06:16:51.117	\N	2026-02-02 06:16:51.085	2026-02-02 06:16:51.118
22	6	FRIEND_REQUEST	최서연님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 13, "fromUserId": 23, "fromUserName": "최서연"}	SENT	PUSH	0	3	\N	2026-02-02 06:17:13.249	\N	2026-02-02 06:17:13.221	2026-02-02 06:17:13.25
23	20	FRIEND_REQUEST	최서연님이 친구 요청을 보냈습니다	친구 요청을 확인해 주세요.	{"requestId": 14, "fromUserId": 23, "fromUserName": "최서연"}	SENT	PUSH	0	3	\N	2026-02-02 06:17:15.106	\N	2026-02-02 06:17:15.085	2026-02-02 06:17:15.108
24	23	FRIEND_ACCEPTED	친구 요청이 수락되었습니다	이지은님과 친구가 되었습니다.	{"friendId": 21, "requestId": 11, "friendName": "이지은"}	SENT	PUSH	0	3	\N	2026-02-02 06:17:41.465	\N	2026-02-02 06:17:41.442	2026-02-02 06:17:41.467
25	23	FRIEND_ACCEPTED	친구 요청이 수락되었습니다	김민수님과 친구가 되었습니다.	{"friendId": 20, "requestId": 14, "friendName": "김민수"}	SENT	PUSH	0	3	\N	2026-02-02 07:09:35.429	\N	2026-02-02 07:09:35.272	2026-02-02 07:09:35.477
\.


--
-- Name: dead_letter_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dead_letter_notifications_id_seq', 1, false);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 9, true);


--
-- Name: notification_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_templates_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 25, true);


--
-- Name: dead_letter_notifications dead_letter_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dead_letter_notifications
    ADD CONSTRAINT dead_letter_notifications_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: dead_letter_notifications_moved_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dead_letter_notifications_moved_at_idx ON public.dead_letter_notifications USING btree (moved_at);


--
-- Name: dead_letter_notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dead_letter_notifications_user_id_idx ON public.dead_letter_notifications USING btree (user_id);


--
-- Name: notification_settings_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_settings_user_id_key ON public.notification_settings USING btree (user_id);


--
-- Name: notification_templates_type_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_templates_type_is_active_idx ON public.notification_templates USING btree (type, is_active);


--
-- Name: notifications_status_retry_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_status_retry_count_idx ON public.notifications USING btree (status, retry_count);


--
-- Name: notifications_status_scheduled_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_status_scheduled_at_idx ON public.notifications USING btree (status, scheduled_at);


--
-- Name: notifications_type_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_type_status_idx ON public.notifications USING btree (type, status);


--
-- Name: notifications_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_created_at_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: notifications_user_id_read_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_read_at_idx ON public.notifications USING btree (user_id, read_at);


--
-- Name: notifications_user_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_status_idx ON public.notifications USING btree (user_id, status);


--
-- PostgreSQL database dump complete
--

\unrestrict OgB4T0885QrbGNvYFcwz21iw92SGwV9Cmc5SLPNSbLXeFT4Bnhh0YbX3ZGvGOre

