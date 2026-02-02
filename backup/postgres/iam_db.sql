--
-- PostgreSQL database dump
--

\restrict zMX6wKZ871E1hIQhBN2zjVeJsdlTK3cDLyOmTWbeCHkwdKGkEZ9Q4yzwLr546ON

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
-- Name: CompanyStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompanyStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING'
);


--
-- Name: CompanyType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompanyType" AS ENUM (
    'PLATFORM',
    'ASSOCIATION',
    'FRANCHISE'
);


--
-- Name: DevicePlatform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DevicePlatform" AS ENUM (
    'IOS',
    'ANDROID',
    'WEB'
);


--
-- Name: FriendRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendRequestStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_logs (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    company_id integer,
    action text NOT NULL,
    resource text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_activity_logs_id_seq OWNED BY public.admin_activity_logs.id;


--
-- Name: admin_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_companies (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    company_id integer NOT NULL,
    company_role_code text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: admin_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_companies_id_seq OWNED BY public.admin_companies.id;


--
-- Name: admin_refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_refresh_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    admin_id integer NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: admin_refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_refresh_tokens_id_seq OWNED BY public.admin_refresh_tokens.id;


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    phone text,
    department text,
    description text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    business_number text,
    company_type public."CompanyType" DEFAULT 'FRANCHISE'::public."CompanyType" NOT NULL,
    address text,
    phone_number text,
    email text,
    website text,
    logo_url text,
    status public."CompanyStatus" DEFAULT 'ACTIVE'::public."CompanyStatus" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id integer NOT NULL,
    from_user_id integer NOT NULL,
    to_user_id integer NOT NULL,
    status public."FriendRequestStatus" DEFAULT 'PENDING'::public."FriendRequestStatus" NOT NULL,
    message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: friend_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.friend_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: friend_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.friend_requests_id_seq OWNED BY public.friend_requests.id;


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id integer NOT NULL,
    user_id integer NOT NULL,
    friend_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: friendships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.friendships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: friendships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.friendships_id_seq OWNED BY public.friendships.id;


--
-- Name: permission_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_masters (
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    level text DEFAULT 'low'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: role_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_masters (
    code text NOT NULL,
    name text NOT NULL,
    description text,
    user_type text NOT NULL,
    scope text DEFAULT 'PLATFORM'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_code text NOT NULL,
    permission_code text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_devices (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform public."DevicePlatform" NOT NULL,
    device_token text NOT NULL,
    device_id text,
    device_name text,
    is_active boolean DEFAULT true NOT NULL,
    last_active_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: user_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_devices_id_seq OWNED BY public.user_devices.id;


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    booking boolean DEFAULT true NOT NULL,
    chat boolean DEFAULT true NOT NULL,
    friend boolean DEFAULT true NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_notification_settings_id_seq OWNED BY public.user_notification_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    phone text,
    role_code text DEFAULT 'USER'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    profile_image_url text,
    password_changed_at timestamp(3) without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_activity_logs_id_seq'::regclass);


--
-- Name: admin_companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_companies ALTER COLUMN id SET DEFAULT nextval('public.admin_companies_id_seq'::regclass);


--
-- Name: admin_refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.admin_refresh_tokens_id_seq'::regclass);


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: friend_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests ALTER COLUMN id SET DEFAULT nextval('public.friend_requests_id_seq'::regclass);


--
-- Name: friendships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships ALTER COLUMN id SET DEFAULT nextval('public.friendships_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: user_devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices ALTER COLUMN id SET DEFAULT nextval('public.user_devices_id_seq'::regclass);


--
-- Name: user_notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings ALTER COLUMN id SET DEFAULT nextval('public.user_notification_settings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: admin_activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_activity_logs (id, admin_id, company_id, action, resource, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: admin_companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_companies (id, admin_id, company_id, company_role_code, is_primary, is_active, created_at, updated_at) FROM stdin;
3	3	10	PLATFORM_ADMIN	t	t	2026-01-13 13:33:32.721	2026-01-13 13:33:32.721
4	4	11	COMPANY_ADMIN	t	t	2026-01-13 13:33:32.839	2026-01-13 13:33:32.839
5	5	10	PLATFORM_SUPPORT	t	t	2026-02-01 12:41:00.038	2026-02-01 12:41:00.038
6	6	10	PLATFORM_VIEWER	t	t	2026-02-01 12:41:00.038	2026-02-01 12:41:00.038
7	7	11	COMPANY_MANAGER	t	t	2026-02-01 12:41:00.038	2026-02-01 12:41:00.038
8	8	11	COMPANY_STAFF	t	t	2026-02-01 12:41:00.038	2026-02-01 12:41:00.038
9	9	11	COMPANY_VIEWER	t	t	2026-02-01 12:41:00.038	2026-02-01 12:41:00.038
\.


--
-- Data for Name: admin_refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_refresh_tokens (id, token, admin_id, expires_at, created_at) FROM stdin;
25	32bf9374b798e38ae9297bf606b9a713aec7e08eee482fe65691e5535280aa28	5	2026-02-08 12:41:48.887	2026-02-01 12:41:48.888
26	c7852f7c4fb4632795f38fe36ac1ee05e63d2154163369b6723adbbd9a1a4e4a	6	2026-02-08 12:41:49.233	2026-02-01 12:41:49.234
27	d201fdfd386607cb18f74dfa843b15bbfffbe205ce7bc1f42b5704f7afa410a6	7	2026-02-08 12:41:49.58	2026-02-01 12:41:49.581
28	a8b11c264c32525f601d69ecb03d6329e14e2a0ad8d5b500a97c053bf83a43df	8	2026-02-08 12:41:49.937	2026-02-01 12:41:49.938
29	bf611a6659ca4f41404f6b3b37c21d709737b2ac4dc9708b047f8214d3d1af11	9	2026-02-08 12:41:50.237	2026-02-01 12:41:50.239
30	1631e490be0cc004ae467a5e04390406c5fb77c86d7b2df45de606d3d8bd0657	3	2026-02-09 12:02:33.934	2026-02-02 12:02:33.935
31	af3082e24edc857b0845052d54263f6ae44b15fa6c929631bb4fa8153588a9ed	3	2026-02-09 12:02:49.323	2026-02-02 12:02:49.324
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, email, password, name, phone, department, description, avatar_url, is_active, last_login_at, created_at, updated_at) FROM stdin;
4	admin@gangnam.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	강남대표	\N	강남 파크골프장	\N	\N	t	\N	2026-01-13 13:33:32.8	2026-01-13 13:33:32.8
5	support@parkgolf.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	고객지원담당	01098760001	고객지원팀	\N	\N	t	2026-02-01 12:41:48.877	2026-02-01 12:40:53.248	2026-02-01 12:41:48.878
6	viewer@parkgolf.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	플랫폼조회자	01098760002	운영팀	\N	\N	t	2026-02-01 12:41:49.17	2026-02-01 12:40:53.248	2026-02-01 12:41:49.226
7	manager@gangnam.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	강남매니저	01098760003	운영팀	\N	\N	t	2026-02-01 12:41:49.572	2026-02-01 12:40:53.248	2026-02-01 12:41:49.573
8	staff@gangnam.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	강남직원	01098760004	현장팀	\N	\N	t	2026-02-01 12:41:49.931	2026-02-01 12:40:53.248	2026-02-01 12:41:49.932
9	viewer@gangnam.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	강남조회자	01098760005	운영팀	\N	\N	t	2026-02-01 12:41:50.229	2026-02-01 12:40:53.248	2026-02-01 12:41:50.23
3	admin@parkgolf.com	$2b$10$wH0T5avc2Jf3Q4v7jX2zCee0AtTdkaNGTKZ/fhQeH76yp1yIDerSa	플랫폼관리자	\N	본사	\N	\N	t	2026-02-02 12:02:49.305	2026-01-13 13:33:32.644	2026-02-02 12:02:49.307
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, code, description, business_number, company_type, address, phone_number, email, website, logo_url, status, is_active, metadata, created_at, updated_at) FROM stdin;
10	파크골프 플랫폼	PLATFORM-HQ	파크골프 플랫폼 본사	\N	PLATFORM	서울시 강남구 테헤란로 123	02-1234-5678	platform@parkgolf.com	\N	\N	ACTIVE	t	\N	2026-01-13 13:33:32.394	2026-01-13 13:33:32.394
11	강남 파크골프장	GANGNAM-GC	강남 지역 파크골프장	123-45-67890	FRANCHISE	서울시 강남구 역삼동 456	02-2222-3333	gangnam@parkgolf.com	\N	\N	ACTIVE	t	\N	2026-01-13 13:33:32.566	2026-01-13 13:33:32.566
12	E2E테스트회사_1768455552631	E-MKF0S2CM	\N	999-99-52631	FRANCHISE	12345 서울시 강남구 테스트동	02-9999-8888	test1768455552631@e2etest.com	\N	\N	ACTIVE	t	\N	2026-01-15 05:39:24.927	2026-01-15 05:39:24.927
\.


--
-- Data for Name: friend_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friend_requests (id, from_user_id, to_user_id, status, message, created_at, updated_at) FROM stdin;
2	4	5	ACCEPTED	\N	2026-01-20 08:41:37.494	2026-01-20 08:42:29.993
3	3	5	ACCEPTED	\N	2026-01-20 09:10:07.195	2026-01-20 12:03:03.092
4	4	6	ACCEPTED	\N	2026-01-21 14:34:39.577	2026-01-25 08:21:14.315
5	6	5	ACCEPTED	\N	2026-01-25 12:06:45.917	2026-01-26 12:57:35.573
6	5	4	ACCEPTED	\N	2026-02-01 06:32:20.317	2026-02-01 06:32:49.199
7	20	4	PENDING	\N	2026-02-02 03:46:49.802	2026-02-02 03:46:49.802
8	20	6	PENDING	\N	2026-02-02 03:46:54.974	2026-02-02 03:46:54.974
9	20	5	PENDING	\N	2026-02-02 03:47:07.292	2026-02-02 03:47:07.292
10	20	21	ACCEPTED	\N	2026-02-02 03:47:16.661	2026-02-02 06:15:56.154
12	23	22	PENDING	\N	2026-02-02 06:16:51.059	2026-02-02 06:16:51.059
13	23	6	PENDING	\N	2026-02-02 06:17:13.199	2026-02-02 06:17:13.199
11	23	21	ACCEPTED	\N	2026-02-02 06:16:11.279	2026-02-02 06:17:41.408
14	23	20	ACCEPTED	\N	2026-02-02 06:17:15.067	2026-02-02 07:09:35.212
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.friendships (id, user_id, friend_id, created_at) FROM stdin;
3	3	5	2026-01-20 12:03:03.092
4	5	3	2026-01-20 12:03:03.092
5	4	6	2026-01-25 08:21:14.315
6	6	4	2026-01-25 08:21:14.315
9	5	4	2026-02-01 06:32:49.199
10	4	5	2026-02-01 06:32:49.199
11	20	21	2026-02-02 06:15:56.154
12	21	20	2026-02-02 06:15:56.154
13	23	21	2026-02-02 06:17:41.408
14	21	23	2026-02-02 06:17:41.408
15	23	20	2026-02-02 07:09:35.212
16	20	23	2026-02-02 07:09:35.212
\.


--
-- Data for Name: permission_masters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission_masters (code, name, description, category, level, is_active, created_at, updated_at) FROM stdin;
ALL	전체 권한	모든 기능 접근	ADMIN	high	t	2026-01-13 13:33:29.537	2026-01-13 13:33:29.537
COMPANIES	회사 관리	회사 CRUD	ADMIN	high	t	2026-01-13 13:33:29.618	2026-01-13 13:33:29.618
COURSES	코스 관리	코스 CRUD	ADMIN	medium	t	2026-01-13 13:33:29.657	2026-01-13 13:33:29.657
TIMESLOTS	타임슬롯 관리	타임슬롯 CRUD	ADMIN	medium	t	2026-01-13 13:33:29.698	2026-01-13 13:33:29.698
BOOKINGS	예약 관리	예약 CRUD	ADMIN	medium	t	2026-01-13 13:33:29.738	2026-01-13 13:33:29.738
USERS	사용자 관리	사용자 관리	ADMIN	medium	t	2026-01-13 13:33:29.778	2026-01-13 13:33:29.778
ADMINS	관리자 관리	관리자 관리	ADMIN	high	t	2026-01-13 13:33:29.817	2026-01-13 13:33:29.817
ANALYTICS	분석/리포트	통계 조회	ADMIN	low	t	2026-01-13 13:33:29.857	2026-01-13 13:33:29.857
SUPPORT	고객 지원	고객 응대	ADMIN	low	t	2026-01-13 13:33:29.896	2026-01-13 13:33:29.896
VIEW	조회	데이터 조회	ADMIN	low	t	2026-01-13 13:33:29.935	2026-01-13 13:33:29.935
PROFILE	프로필 관리	프로필 수정	USER	low	t	2026-01-13 13:33:29.974	2026-01-13 13:33:29.974
COURSE_VIEW	코스 조회	코스 조회	USER	low	t	2026-01-13 13:33:30.013	2026-01-13 13:33:30.013
BOOKING_VIEW	예약 조회	예약 조회	USER	low	t	2026-01-13 13:33:30.051	2026-01-13 13:33:30.051
BOOKING_MANAGE	예약 관리	예약 생성/취소	USER	low	t	2026-01-13 13:33:30.09	2026-01-13 13:33:30.09
PAYMENT	결제/환불	결제 처리	USER	low	t	2026-01-13 13:33:30.13	2026-01-13 13:33:30.13
PREMIUM_BOOKING	프리미엄 예약	프리미엄 예약	USER	medium	t	2026-01-13 13:33:30.169	2026-01-13 13:33:30.169
PRIORITY_BOOKING	우선 예약	우선 예약	USER	medium	t	2026-01-13 13:33:30.209	2026-01-13 13:33:30.209
ADVANCED_SEARCH	고급 검색	고급 검색	USER	medium	t	2026-01-13 13:33:30.248	2026-01-13 13:33:30.248
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, token, user_id, expires_at, created_at) FROM stdin;
70	bcda7d36d4aec7501f16963265ec53f3e932a5cc175d762cfbf181908ad12d29	21	2026-02-09 12:33:34.52	2026-02-02 12:33:34.521
37	758e8bc8113c85a77a5f13998c4f272b44a5441cc91336332158e48bf18548e2	23	2026-02-08 12:34:30.575	2026-02-01 12:34:30.626
45	eb464be9b2442b2f3fbe53528dc088f7c8dae8c10869b37e3c85e7a6205ed9d0	3	2026-02-09 05:14:37.038	2026-02-02 05:14:37.04
47	16749618d8114037f3949cb831b1590d3766cfd91a4d8f083dad3ec2566b5e32	3	2026-02-09 05:37:10.524	2026-02-02 05:37:10.525
48	4af8d6a9dc221821951b067a48ee255a4033d6ca9df11e563a9b315666e72db6	3	2026-02-09 05:41:00.392	2026-02-02 05:41:00.393
49	bdba5108b18cf1030fab51304b835f545356c50c6fe9f045d8a5c575d00630d7	3	2026-02-09 05:41:17.632	2026-02-02 05:41:17.633
50	881035b0ff785f58e6ccbc55fb96926bdcbc354e519645d8ac076be1c2749c6b	3	2026-02-09 05:43:32.183	2026-02-02 05:43:32.184
52	75ea8ed8a06fd83f8d639007b6cdbed92fc54ae8803416540560d1651825caa4	3	2026-02-09 05:43:40.999	2026-02-02 05:43:41
54	e1e2c8a44df7c3d3bca3ddb8094fa5595e1e5782fd7dd7a88395bf62d2e3a401	3	2026-02-09 05:45:41.732	2026-02-02 05:45:41.733
56	4c0f6fc4dd97724f175f0654fb0b5df485935aacae40a51fa5ed6ba16d9cb295	3	2026-02-09 05:46:06.298	2026-02-02 05:46:06.299
57	45593dd9666cd3b1695a5dbe3033eca6194c5e518adc2c9d9c3bfe657e9fe41a	3	2026-02-09 05:55:12.532	2026-02-02 05:55:12.578
59	7eb2b0739665bd70832e4342805b862e88ffc808cd59d9362ac5dfe2f83dc836	21	2026-02-09 06:15:49.717	2026-02-02 06:15:49.718
62	49cc5fb341079aa08090692878caf105eefac383454bdefafa2c32ad12cb69a7	23	2026-02-09 08:04:05.243	2026-02-02 08:04:05.244
68	534e1ec0388d3ff3356d05adf743991dad230f23bd14f375f20ae3f94d075c43	23	2026-02-09 12:14:02.324	2026-02-02 12:14:02.325
69	660de8536cf2360bd16b9e3561ab25192e250789021e72c595f2c4a7b0811075	20	2026-02-09 12:17:44.498	2026-02-02 12:17:44.499
\.


--
-- Data for Name: role_masters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_masters (code, name, description, user_type, scope, level, is_active, created_at, updated_at) FROM stdin;
PLATFORM_ADMIN	플랫폼 관리자	본사 최고 관리자	ADMIN	PLATFORM	100	t	2026-01-13 13:33:30.289	2026-01-13 13:33:30.289
PLATFORM_SUPPORT	플랫폼 고객지원	전체 고객지원/조회	ADMIN	PLATFORM	80	t	2026-01-13 13:33:30.366	2026-01-13 13:33:30.366
PLATFORM_VIEWER	플랫폼 조회	전체 데이터 조회	ADMIN	PLATFORM	20	t	2026-01-13 13:33:30.405	2026-01-13 13:33:30.405
COMPANY_ADMIN	회사 관리자	회사 대표/총괄	ADMIN	COMPANY	90	t	2026-01-13 13:33:30.444	2026-01-13 13:33:30.444
COMPANY_MANAGER	회사 매니저	운영 매니저	ADMIN	COMPANY	60	t	2026-01-13 13:33:30.483	2026-01-13 13:33:30.483
COMPANY_STAFF	회사 직원	현장 직원	ADMIN	COMPANY	40	t	2026-01-13 13:33:30.522	2026-01-13 13:33:30.522
COMPANY_VIEWER	회사 조회	회사 데이터 조회	ADMIN	COMPANY	20	t	2026-01-13 13:33:30.561	2026-01-13 13:33:30.561
PREMIUM	프리미엄 회원	프리미엄 회원	USER	PLATFORM	30	t	2026-01-13 13:33:30.6	2026-01-13 13:33:30.6
USER	일반 회원	일반 회원	USER	PLATFORM	20	t	2026-01-13 13:33:30.638	2026-01-13 13:33:30.638
GUEST	게스트	게스트	USER	PLATFORM	10	t	2026-01-13 13:33:30.678	2026-01-13 13:33:30.678
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (role_code, permission_code, created_at) FROM stdin;
PLATFORM_ADMIN	ALL	2026-01-13 13:33:30.716
PLATFORM_SUPPORT	BOOKINGS	2026-01-13 13:33:30.794
PLATFORM_SUPPORT	USERS	2026-01-13 13:33:30.833
PLATFORM_SUPPORT	ANALYTICS	2026-01-13 13:33:30.872
PLATFORM_SUPPORT	SUPPORT	2026-01-13 13:33:30.912
PLATFORM_SUPPORT	VIEW	2026-01-13 13:33:30.951
PLATFORM_VIEWER	VIEW	2026-01-13 13:33:30.99
COMPANY_ADMIN	COMPANIES	2026-01-13 13:33:31.029
COMPANY_ADMIN	COURSES	2026-01-13 13:33:31.068
COMPANY_ADMIN	TIMESLOTS	2026-01-13 13:33:31.107
COMPANY_ADMIN	BOOKINGS	2026-01-13 13:33:31.145
COMPANY_ADMIN	USERS	2026-01-13 13:33:31.185
COMPANY_ADMIN	ADMINS	2026-01-13 13:33:31.224
COMPANY_ADMIN	ANALYTICS	2026-01-13 13:33:31.263
COMPANY_ADMIN	VIEW	2026-01-13 13:33:31.302
COMPANY_MANAGER	COURSES	2026-01-13 13:33:31.341
COMPANY_MANAGER	TIMESLOTS	2026-01-13 13:33:31.38
COMPANY_MANAGER	BOOKINGS	2026-01-13 13:33:31.418
COMPANY_MANAGER	USERS	2026-01-13 13:33:31.458
COMPANY_MANAGER	ANALYTICS	2026-01-13 13:33:31.497
COMPANY_MANAGER	VIEW	2026-01-13 13:33:31.536
COMPANY_STAFF	TIMESLOTS	2026-01-13 13:33:31.575
COMPANY_STAFF	BOOKINGS	2026-01-13 13:33:31.614
COMPANY_STAFF	SUPPORT	2026-01-13 13:33:31.653
COMPANY_STAFF	VIEW	2026-01-13 13:33:31.692
COMPANY_VIEWER	VIEW	2026-01-13 13:33:31.731
PREMIUM	PROFILE	2026-01-13 13:33:31.77
PREMIUM	COURSE_VIEW	2026-01-13 13:33:31.809
PREMIUM	BOOKING_VIEW	2026-01-13 13:33:31.847
PREMIUM	BOOKING_MANAGE	2026-01-13 13:33:31.887
PREMIUM	PAYMENT	2026-01-13 13:33:31.926
PREMIUM	PREMIUM_BOOKING	2026-01-13 13:33:31.964
PREMIUM	PRIORITY_BOOKING	2026-01-13 13:33:32.003
PREMIUM	ADVANCED_SEARCH	2026-01-13 13:33:32.042
USER	PROFILE	2026-01-13 13:33:32.082
USER	COURSE_VIEW	2026-01-13 13:33:32.122
USER	BOOKING_VIEW	2026-01-13 13:33:32.161
USER	BOOKING_MANAGE	2026-01-13 13:33:32.2
USER	PAYMENT	2026-01-13 13:33:32.238
GUEST	COURSE_VIEW	2026-01-13 13:33:32.278
\.


--
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_devices (id, user_id, platform, device_token, device_id, device_name, is_active, last_active_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_notification_settings (id, user_id, booking, chat, friend, marketing, created_at, updated_at) FROM stdin;
1	4	t	t	t	f	2026-01-23 08:05:30.645	2026-01-23 08:05:30.645
2	5	t	t	t	f	2026-01-23 09:32:02.944	2026-01-23 09:32:02.944
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, name, phone, role_code, is_active, created_at, updated_at, profile_image_url, password_changed_at) FROM stdin;
3	test@parkgolf.com	$2b$10$S7TaQ4MhMK394Oh17cBY6uYeWqPfjLJN2wRrdRTQ0wZExEJN6A4Fy	테스트사용자	01011112222	USER	t	2026-01-13 13:33:33.09	2026-01-13 13:33:33.09	\N	\N
4	cheolsu@parkgolf.com	$2b$10$S7TaQ4MhMK394Oh17cBY6uYeWqPfjLJN2wRrdRTQ0wZExEJN6A4Fy	김철수	01033334444	USER	t	2026-01-13 13:33:33.129	2026-02-01 12:36:03.892	\N	\N
5	younghee@parkgolf.com	$2b$10$S7TaQ4MhMK394Oh17cBY6uYeWqPfjLJN2wRrdRTQ0wZExEJN6A4Fy	박영희	01055556666	USER	t	2026-01-13 13:33:33.168	2026-02-01 12:36:03.892	\N	\N
20	minsoo@parkgolf.com	$2b$10$vrDXD.vWeKdc6ySAXLYIO.DcHNFhdcF5ZIWQaFXSurTgR5xgVyMfa	김민수	01012345001	USER	t	2026-02-01 12:33:43.271	2026-02-01 12:36:03.892	\N	2026-02-01 12:33:43.271
21	jieun@parkgolf.com	$2b$10$vrDXD.vWeKdc6ySAXLYIO.DcHNFhdcF5ZIWQaFXSurTgR5xgVyMfa	이지은	01012345002	USER	t	2026-02-01 12:33:43.271	2026-02-01 12:36:03.892	\N	2026-02-01 12:33:43.271
22	junhyuk@parkgolf.com	$2b$10$vrDXD.vWeKdc6ySAXLYIO.DcHNFhdcF5ZIWQaFXSurTgR5xgVyMfa	박준혁	01012345003	USER	t	2026-02-01 12:33:43.271	2026-02-01 12:36:03.892	\N	2026-02-01 12:33:43.271
23	seoyeon@parkgolf.com	$2b$10$vrDXD.vWeKdc6ySAXLYIO.DcHNFhdcF5ZIWQaFXSurTgR5xgVyMfa	최서연	01012345004	USER	t	2026-02-01 12:33:43.271	2026-02-01 12:36:03.892	\N	2026-02-01 12:33:43.271
6	minsu@parkgolf.com	$2b$10$S7TaQ4MhMK394Oh17cBY6uYeWqPfjLJN2wRrdRTQ0wZExEJN6A4Fy	이민수	01077778888	USER	t	2026-01-13 13:33:33.207	2026-02-01 12:36:14.036	\N	\N
\.


--
-- Name: admin_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_activity_logs_id_seq', 1, false);


--
-- Name: admin_companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_companies_id_seq', 9, true);


--
-- Name: admin_refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_refresh_tokens_id_seq', 31, true);


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admins_id_seq', 9, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.companies_id_seq', 12, true);


--
-- Name: friend_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.friend_requests_id_seq', 14, true);


--
-- Name: friendships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.friendships_id_seq', 16, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 70, true);


--
-- Name: user_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_devices_id_seq', 1, false);


--
-- Name: user_notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_notification_settings_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 23, true);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_companies admin_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_companies
    ADD CONSTRAINT admin_companies_pkey PRIMARY KEY (id);


--
-- Name: admin_refresh_tokens admin_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_refresh_tokens
    ADD CONSTRAINT admin_refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: permission_masters permission_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_masters
    ADD CONSTRAINT permission_masters_pkey PRIMARY KEY (code);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: role_masters role_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_masters
    ADD CONSTRAINT role_masters_pkey PRIMARY KEY (code);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_code, permission_code);


--
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: admin_activity_logs_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_activity_logs_admin_id_idx ON public.admin_activity_logs USING btree (admin_id);


--
-- Name: admin_activity_logs_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_activity_logs_company_id_idx ON public.admin_activity_logs USING btree (company_id);


--
-- Name: admin_activity_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_activity_logs_created_at_idx ON public.admin_activity_logs USING btree (created_at);


--
-- Name: admin_companies_admin_id_company_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_companies_admin_id_company_id_key ON public.admin_companies USING btree (admin_id, company_id);


--
-- Name: admin_companies_admin_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_companies_admin_id_idx ON public.admin_companies USING btree (admin_id);


--
-- Name: admin_companies_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_companies_company_id_idx ON public.admin_companies USING btree (company_id);


--
-- Name: admin_companies_company_role_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_companies_company_role_code_idx ON public.admin_companies USING btree (company_role_code);


--
-- Name: admin_refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_refresh_tokens_token_key ON public.admin_refresh_tokens USING btree (token);


--
-- Name: admins_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admins_created_at_idx ON public.admins USING btree (created_at);


--
-- Name: admins_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admins_email_key ON public.admins USING btree (email);


--
-- Name: admins_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admins_is_active_idx ON public.admins USING btree (is_active);


--
-- Name: companies_business_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_business_number_key ON public.companies USING btree (business_number);


--
-- Name: companies_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_code_idx ON public.companies USING btree (code);


--
-- Name: companies_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_code_key ON public.companies USING btree (code);


--
-- Name: companies_company_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_company_type_idx ON public.companies USING btree (company_type);


--
-- Name: companies_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_email_key ON public.companies USING btree (email);


--
-- Name: companies_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_is_active_idx ON public.companies USING btree (is_active);


--
-- Name: companies_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_status_idx ON public.companies USING btree (status);


--
-- Name: friend_requests_from_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX friend_requests_from_user_id_idx ON public.friend_requests USING btree (from_user_id);


--
-- Name: friend_requests_from_user_id_to_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX friend_requests_from_user_id_to_user_id_key ON public.friend_requests USING btree (from_user_id, to_user_id);


--
-- Name: friend_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX friend_requests_status_idx ON public.friend_requests USING btree (status);


--
-- Name: friend_requests_to_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX friend_requests_to_user_id_idx ON public.friend_requests USING btree (to_user_id);


--
-- Name: friendships_friend_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX friendships_friend_id_idx ON public.friendships USING btree (friend_id);


--
-- Name: friendships_user_id_friend_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX friendships_user_id_friend_id_key ON public.friendships USING btree (user_id, friend_id);


--
-- Name: friendships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX friendships_user_id_idx ON public.friendships USING btree (user_id);


--
-- Name: permission_masters_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permission_masters_category_idx ON public.permission_masters USING btree (category);


--
-- Name: permission_masters_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permission_masters_is_active_idx ON public.permission_masters USING btree (is_active);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: role_masters_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_masters_is_active_idx ON public.role_masters USING btree (is_active);


--
-- Name: role_masters_scope_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_masters_scope_idx ON public.role_masters USING btree (scope);


--
-- Name: role_masters_user_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_masters_user_type_idx ON public.role_masters USING btree (user_type);


--
-- Name: role_permissions_permission_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_permissions_permission_code_idx ON public.role_permissions USING btree (permission_code);


--
-- Name: role_permissions_role_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_permissions_role_code_idx ON public.role_permissions USING btree (role_code);


--
-- Name: user_devices_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_devices_is_active_idx ON public.user_devices USING btree (is_active);


--
-- Name: user_devices_platform_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_devices_platform_idx ON public.user_devices USING btree (platform);


--
-- Name: user_devices_user_id_device_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_devices_user_id_device_token_key ON public.user_devices USING btree (user_id, device_token);


--
-- Name: user_devices_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_devices_user_id_idx ON public.user_devices USING btree (user_id);


--
-- Name: user_notification_settings_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_notification_settings_user_id_key ON public.user_notification_settings USING btree (user_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_is_active_idx ON public.users USING btree (is_active);


--
-- Name: users_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_name_idx ON public.users USING btree (name);


--
-- Name: users_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_phone_idx ON public.users USING btree (phone);


--
-- Name: users_role_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role_code_idx ON public.users USING btree (role_code);


--
-- Name: admin_activity_logs admin_activity_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: admin_companies admin_companies_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_companies
    ADD CONSTRAINT admin_companies_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: admin_companies admin_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_companies
    ADD CONSTRAINT admin_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: admin_companies admin_companies_company_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_companies
    ADD CONSTRAINT admin_companies_company_role_code_fkey FOREIGN KEY (company_role_code) REFERENCES public.role_masters(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: admin_refresh_tokens admin_refresh_tokens_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_refresh_tokens
    ADD CONSTRAINT admin_refresh_tokens_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friendships friendships_friend_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friendships friendships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES public.permission_masters(code) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.role_masters(code) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_role_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_code_fkey FOREIGN KEY (role_code) REFERENCES public.role_masters(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict zMX6wKZ871E1hIQhBN2zjVeJsdlTK3cDLyOmTWbeCHkwdKGkEZ9Q4yzwLr546ON

