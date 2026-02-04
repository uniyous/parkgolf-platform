--
-- PostgreSQL database dump
--

\restrict vTuohRpFFpUPtnZWPhiUoUlNOxTZcZsbclurCa1VfcXlnlzadyymyMFcPztLbWq

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
-- Name: MessageType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MessageType" AS ENUM (
    'TEXT',
    'IMAGE',
    'SYSTEM'
);


--
-- Name: RoomType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoomType" AS ENUM (
    'DIRECT',
    'GROUP',
    'BOOKING'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id text NOT NULL,
    "roomId" text NOT NULL,
    "senderId" integer NOT NULL,
    "senderName" text NOT NULL,
    content text NOT NULL,
    type public."MessageType" DEFAULT 'TEXT'::public."MessageType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: chat_room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_room_members (
    id text NOT NULL,
    "roomId" text NOT NULL,
    "userId" integer NOT NULL,
    "userName" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "lastReadMessageId" text,
    "lastReadAt" timestamp(3) without time zone,
    "userEmail" text
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id text NOT NULL,
    name text,
    type public."RoomType" DEFAULT 'GROUP'::public."RoomType" NOT NULL,
    "bookingId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reads (
    id text NOT NULL,
    "messageId" text NOT NULL,
    "userId" integer NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, "roomId", "senderId", "senderName", content, type, "createdAt", "deletedAt") FROM stdin;
6fa252c2-922a-47ae-b780-078b32266b59	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	대화 잘되나 ?	TEXT	2026-02-02 07:10:48.656	\N
65ceff49-4146-43e8-ba18-87f3aa5d73e5	31154880-219a-4ff4-8e40-42590792f0fc	23	seoyeon@parkgolf.com	대화 잘되나 ?	TEXT	2026-02-02 07:10:48.881	\N
38437b4b-a429-4d5a-b118-078612c12fb7	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	오 잘되는데	TEXT	2026-02-02 07:10:52.261	\N
7caa155a-569a-4606-a68f-cf3f3d09d42b	31154880-219a-4ff4-8e40-42590792f0fc	23	seoyeon@parkgolf.com	오 잘되는데	TEXT	2026-02-02 07:10:52.342	\N
446e562f-99f6-432c-9fc4-4f810b45e610	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	안정적이네	TEXT	2026-02-02 07:11:02.956	\N
94447885-9391-4fba-839d-182625c6399c	31154880-219a-4ff4-8e40-42590792f0fc	20	minsoo@parkgolf.com	안정적이네	TEXT	2026-02-02 07:11:03.022	\N
f6864eee-0920-45f2-8442-f12ef49af73d	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	아이폰에서 2번 보네네	TEXT	2026-02-02 07:11:18.776	\N
d3dcf003-1894-4a35-81e7-fdcc7168aa31	31154880-219a-4ff4-8e40-42590792f0fc	20	minsoo@parkgolf.com	아이폰에서 2번 보네네	TEXT	2026-02-02 07:11:18.839	\N
288e9eb7-cd1f-4bb5-94e4-2bf5bfff9c4b	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	하이	TEXT	2026-02-02 08:51:21.885	\N
f89cebe0-75b0-48d5-98a7-22fc3e03c527	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	뭐지	TEXT	2026-02-02 08:51:38.218	\N
c14e8bc6-3205-4307-9445-0d37cad3a9b2	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	문가 연결이 안될때가 있네	TEXT	2026-02-02 08:51:54.437	\N
cdfbd351-c9d1-4335-b429-54516677d273	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	연결되면 잘되는데	TEXT	2026-02-02 08:52:06.05	\N
0f64585b-3a2a-439e-91ff-e23d7f01bb43	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	잘 끊기는것 같네	TEXT	2026-02-02 08:52:12.888	\N
c645b979-1a3e-4a86-9b93-bfae66038b16	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	뭔밍	TEXT	2026-02-02 08:52:22.281	\N
491bd2e4-6210-4c70-b43a-6cd7da25632b	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	지금도 메시지 잘 전달되나 ?	TEXT	2026-02-02 09:00:56.741	\N
c9f04947-94f8-4f78-8d53-67502d027527	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	ㅎㅎㅎㅎ	TEXT	2026-02-02 09:27:08.092	\N
c873a024-05b5-4ab0-8e30-2574cea91f99	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	오호	TEXT	2026-02-02 09:27:12.016	\N
b36c108a-6645-4e5e-b30f-dd06c610194f	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	한참 지나도 채팅 잘 되네	TEXT	2026-02-02 09:27:25.891	\N
dc367f07-ee15-427d-91eb-01fefd04480e	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㅇㄹㄹㅎㅎ	TEXT	2026-02-02 11:19:16.378	\N
c97e0f62-a670-4e89-b1e8-6a3e39d1cace	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅎㅎㅎ	TEXT	2026-02-02 11:49:40.731	\N
a14b23b3-3c27-4539-85ef-38f8ecb0f403	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㅎㅎㅎㅎㅎ	TEXT	2026-02-02 11:49:49.826	\N
3b4e10d9-6042-406e-a5c6-df003adfe2d0	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㄹㄹㅇㅇㄱㄱㅅ쇼	TEXT	2026-02-02 11:50:14.885	\N
96a0d64a-800d-4963-91e3-093262dae58c	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㄴㅇㄹㅎㅎ호ㅗㅗ	TEXT	2026-02-02 11:50:19.029	\N
cc9e84c2-0734-43a4-9734-02ed2b73190b	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅎㅎㄱㄱㄱㅅㅎ	TEXT	2026-02-02 11:51:11.372	\N
9f12c560-65c3-42aa-8366-7710d25ede53	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	효ㅛㅗ	TEXT	2026-02-02 12:06:17.689	\N
838601c5-4cde-44da-9603-0bf1315da317	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅇㄹ호ㅗㅗㅗ	TEXT	2026-02-02 12:06:24.206	\N
a2dc296c-cd85-4716-a9a5-a38981cc7acc	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㅇㅇㄹ호ㅗㅓㅓ	TEXT	2026-02-02 12:06:28.12	\N
0bee1848-3c9d-4036-ad7c-9de9070371c5	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅓ어아랄	TEXT	2026-02-02 12:08:23.302	\N
f31be9a6-8c6d-4fc2-8ffb-76b17aec0971	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㄹㄹ호ㅗㅗ	TEXT	2026-02-02 12:08:26.521	\N
3db44830-ecd7-4b68-b7d8-63094654fe17	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㅌㄹㄹ호ㅗ	TEXT	2026-02-02 12:08:28.341	\N
83967570-320c-4368-90c8-a7b7bd84ee3f	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅇㄹ호ㅗ	TEXT	2026-02-02 12:09:58.631	\N
6239587f-e463-46bf-88c5-f9419de926e1	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㅊㄹ호ㅗㅗㅓ	TEXT	2026-02-02 12:12:55.268	\N
205923ac-c7f9-48be-b347-52db18dc0367	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	하이롱	TEXT	2026-02-02 12:14:16.517	\N
0a7762e6-68fd-4bc6-9880-9fb209ccadc4	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	와우 다들 모였네	TEXT	2026-02-02 12:14:27.128	\N
2be00548-9c0e-46a6-babc-a20a0d782c26	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	잘들 지내시나 ?	TEXT	2026-02-02 12:14:32.477	\N
17ddc8e4-9049-49a5-a214-a8f61f9ef238	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	좋는데	TEXT	2026-02-02 12:14:39.659	\N
0524463b-e653-4a61-a870-89af40ab4bc7	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	안끊기고 잘되면 된다	TEXT	2026-02-02 12:14:50.657	\N
e8e1cd95-4cd3-4ac1-b638-2f95715cfda6	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	앚직까지는 좋아	TEXT	2026-02-02 12:15:01.657	\N
90d6511b-23f2-4873-bc95-4faf62135394	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	ㄹㄹ호ㅗㅗ	TEXT	2026-02-02 12:16:45.418	\N
da311d92-270a-4427-bb88-d1756f783eb1	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	ㅇㄱㅅㅅ쇼ㅗㅗㅗㅗㅗ	TEXT	2026-02-02 12:18:19.673	\N
0b81a986-87a0-4cf4-9e1f-24397e0eca05	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	ㅁㄴㅇㄹㅁㄴㅇ	TEXT	2026-02-02 12:32:24.915	\N
8d24d707-3516-4ce8-89ec-207e4794d49d	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	오노노토큩	TEXT	2026-02-02 12:32:30.961	\N
e2292d20-1ae5-4e8d-aab0-cc6316fca5d3	31154880-219a-4ff4-8e40-42590792f0fc	23	최서연	ㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁㄴㅇㄹㅁ	TEXT	2026-02-02 12:33:55.355	\N
\.


--
-- Data for Name: chat_room_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_room_members (id, "roomId", "userId", "userName", "joinedAt", "leftAt", "isAdmin", "lastReadMessageId", "lastReadAt", "userEmail") FROM stdin;
36d922d3-5f81-492f-8d4f-8908d2db65dd	31154880-219a-4ff4-8e40-42590792f0fc	20	김민수	2026-02-02 07:10:17.614	\N	t	\N	\N	minsoo@parkgolf.com
699bf56d-9cd4-4361-9f8a-187f38bd4718	31154880-219a-4ff4-8e40-42590792f0fc	23	seoyeon@parkgolf.com	2026-02-02 07:10:17.614	\N	f	\N	\N	seoyeon@parkgolf.com
5b8a1da7-48fc-4693-89d7-e1b4fa0d423c	31154880-219a-4ff4-8e40-42590792f0fc	21	이지은	2026-02-02 07:10:17.614	\N	f	\N	2026-02-02 12:33:38.212	jieun@parkgolf.com
\.


--
-- Data for Name: chat_rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_rooms (id, name, type, "bookingId", "createdAt", "updatedAt") FROM stdin;
31154880-219a-4ff4-8e40-42590792f0fc	김민수, 이지은	GROUP	\N	2026-02-02 07:10:17.614	2026-02-02 12:33:55.375
\.


--
-- Data for Name: message_reads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_reads (id, "messageId", "userId", "readAt") FROM stdin;
\.


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_room_members chat_room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT chat_room_members_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (id);


--
-- Name: chat_messages_roomId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_messages_roomId_createdAt_idx" ON public.chat_messages USING btree ("roomId", "createdAt");


--
-- Name: chat_messages_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_messages_senderId_idx" ON public.chat_messages USING btree ("senderId");


--
-- Name: chat_room_members_roomId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "chat_room_members_roomId_userId_key" ON public.chat_room_members USING btree ("roomId", "userId");


--
-- Name: chat_room_members_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_room_members_userId_idx" ON public.chat_room_members USING btree ("userId");


--
-- Name: chat_rooms_bookingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_rooms_bookingId_idx" ON public.chat_rooms USING btree ("bookingId");


--
-- Name: chat_rooms_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_rooms_type_idx ON public.chat_rooms USING btree (type);


--
-- Name: message_reads_messageId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "message_reads_messageId_userId_key" ON public.message_reads USING btree ("messageId", "userId");


--
-- Name: message_reads_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "message_reads_userId_idx" ON public.message_reads USING btree ("userId");


--
-- Name: chat_messages chat_messages_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_room_members chat_room_members_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_room_members
    ADD CONSTRAINT "chat_room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.chat_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vTuohRpFFpUPtnZWPhiUoUlNOxTZcZsbclurCa1VfcXlnlzadyymyMFcPztLbWq

