# Chat Workflow Documentation

채팅 시스템의 전체 아키텍처와 데이터 흐름을 설명합니다.

## 목차

1. [시스템 아키텍처](#시스템-아키텍처)
2. [컴포넌트 구성](#컴포넌트-구성)
3. [데이터 흐름](#데이터-흐름)
4. [REST API 흐름](#rest-api-흐름)
5. [WebSocket 실시간 통신](#websocket-실시간-통신)
6. [데이터베이스 스키마](#데이터베이스-스키마)
7. [NATS 메시지 패턴](#nats-메시지-패턴)

---

## 시스템 아키텍처

```mermaid
flowchart TB
    subgraph Clients["클라이언트"]
        WEB["user-app-web<br/>(React + Vite)"]
        IOS["user-app-ios<br/>(SwiftUI)"]
    end

    subgraph Gateway["게이트웨이 레이어"]
        BFF["user-api<br/>(BFF - NestJS)"]
        WSG["chat-gateway<br/>(WebSocket Gateway)"]
    end

    subgraph Messaging["메시징 레이어"]
        NATS["NATS JetStream"]
    end

    subgraph Services["마이크로서비스"]
        CHAT["chat-service<br/>(NestJS + Prisma)"]
    end

    subgraph Database["데이터베이스"]
        PG["PostgreSQL"]
    end

    WEB -->|REST API| BFF
    IOS -->|REST API| BFF
    WEB -->|WebSocket| WSG
    IOS -->|WebSocket| WSG

    BFF -->|NATS Request/Reply| NATS
    WSG -->|NATS Pub/Sub| NATS

    NATS -->|Message Pattern| CHAT
    CHAT -->|Prisma ORM| PG
```

---

## 컴포넌트 구성

### 클라이언트

| 컴포넌트 | 기술 스택 | 역할 |
|---------|----------|------|
| **user-app-web** | React, Vite, Socket.IO Client | 웹 브라우저용 채팅 UI |
| **user-app-ios** | SwiftUI, SocketIO | iOS 앱용 채팅 UI |

### 백엔드

| 컴포넌트 | 기술 스택 | 역할 |
|---------|----------|------|
| **user-api** | NestJS | REST API 제공 (BFF) |
| **chat-gateway** | NestJS, Socket.IO | WebSocket 실시간 통신 |
| **chat-service** | NestJS, Prisma | 채팅 비즈니스 로직 + DB |
| **NATS JetStream** | NATS | 메시지 브로커 |

---

## 데이터 흐름

### 전체 흐름 개요

```mermaid
sequenceDiagram
    participant Client as Client<br/>(Web/iOS)
    participant BFF as user-api<br/>(BFF)
    participant Gateway as chat-gateway<br/>(WebSocket)
    participant NATS as NATS<br/>JetStream
    participant Service as chat-service
    participant DB as PostgreSQL

    Note over Client,DB: REST API를 통한 채팅방/메시지 조회
    Client->>BFF: GET /api/user/chat/rooms
    BFF->>NATS: chat.rooms.list
    NATS->>Service: Message Pattern
    Service->>DB: Prisma Query
    DB-->>Service: ChatRoom[]
    Service-->>NATS: Response
    NATS-->>BFF: Response
    BFF-->>Client: { success: true, data: [...] }

    Note over Client,DB: WebSocket을 통한 실시간 메시지 전송
    Client->>Gateway: connect(token)
    Gateway->>Gateway: JWT 검증
    Gateway-->>Client: connected

    Client->>Gateway: join_room({ roomId })
    Gateway->>NATS: Subscribe chat.room.{roomId}.message
    Gateway-->>Client: { success: true }

    Client->>Gateway: send_message({ roomId, content })
    Gateway->>NATS: Publish chat.room.{roomId}.message
    Gateway-->>Client: new_message (즉시 전달)
    NATS->>Service: chat.messages.save
    Service->>DB: Insert ChatMessage
```

---

## REST API 흐름

REST API는 채팅방 목록/상세 조회, 메시지 히스토리 조회, 채팅방 생성 등에 사용됩니다.

### 1. 채팅방 목록 조회

```mermaid
sequenceDiagram
    participant Client
    participant BFF as user-api
    participant NATS
    participant Service as chat-service
    participant DB as PostgreSQL

    Client->>BFF: GET /api/user/chat/rooms
    Note right of Client: Authorization: Bearer {token}

    BFF->>BFF: JWT에서 userId 추출
    BFF->>NATS: send('chat.rooms.list', { userId })

    NATS->>Service: @MessagePattern('chat.rooms.list')
    Service->>DB: prisma.chatRoom.findMany({<br/>  where: { members: { some: { userId } } }<br/>})
    DB-->>Service: ChatRoom[] with members, lastMessage

    Service->>Service: Transform response
    Service-->>NATS: { success: true, data: rooms }
    NATS-->>BFF: Response
    BFF-->>Client: HTTP 200 { success: true, data: [...] }
```

**엔드포인트:**
```
GET /api/user/chat/rooms
Authorization: Bearer {JWT_TOKEN}
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1234",
      "name": "박영희",
      "type": "DIRECT",
      "members": [
        {
          "id": "member-uuid",
          "userId": 4,
          "userName": "김철수",
          "joinedAt": "2024-01-15T10:00:00Z"
        }
      ],
      "lastMessage": {
        "id": "msg-uuid",
        "content": "안녕하세요!",
        "senderId": 4,
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. 채팅방 생성

```mermaid
sequenceDiagram
    participant Client
    participant BFF as user-api
    participant NATS
    participant Service as chat-service
    participant DB as PostgreSQL

    Client->>BFF: POST /api/user/chat/rooms
    Note right of Client: { name, type, participant_ids }

    BFF->>BFF: participant_ids에 현재 userId 추가
    BFF->>NATS: send('chat.rooms.create', {<br/>  name, type, memberIds, memberNames<br/>})

    NATS->>Service: @MessagePattern('chat.rooms.create')

    alt type === 'DIRECT' && memberIds.length === 2
        Service->>DB: 기존 DIRECT 채팅방 검색
        alt 기존 채팅방 존재
            DB-->>Service: Existing ChatRoom
            Service-->>NATS: { success: true, data: existingRoom }
        else 새 채팅방 필요
            Service->>DB: prisma.chatRoom.create({<br/>  data: { name, type, members: {...} }<br/>})
            DB-->>Service: New ChatRoom
            Service-->>NATS: { success: true, data: newRoom }
        end
    else GROUP or BOOKING
        Service->>DB: prisma.chatRoom.create()
        DB-->>Service: New ChatRoom
        Service-->>NATS: { success: true, data: room }
    end

    NATS-->>BFF: Response
    BFF-->>Client: HTTP 201 { success: true, data: room }
```

**엔드포인트:**
```
POST /api/user/chat/rooms
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "name": "그룹 채팅방",
  "type": "GROUP",
  "participant_ids": ["5", "6", "7"]
}
```

### 3. 메시지 목록 조회

```mermaid
sequenceDiagram
    participant Client
    participant BFF as user-api
    participant NATS
    participant Service as chat-service
    participant DB as PostgreSQL

    Client->>BFF: GET /api/user/chat/rooms/{roomId}/messages?page=1&limit=50

    BFF->>NATS: send('chat.messages.list', {<br/>  roomId, userId, limit, skip<br/>})

    NATS->>Service: @MessagePattern('chat.messages.list')
    Service->>DB: prisma.chatMessage.findMany({<br/>  where: { roomId, deletedAt: null },<br/>  orderBy: { createdAt: 'desc' },<br/>  take: limit + 1<br/>})
    DB-->>Service: ChatMessage[]

    Service->>Service: Cursor pagination 처리
    Service-->>NATS: { success: true, data: {<br/>  messages, hasMore, nextCursor<br/>} }
    NATS-->>BFF: Response
    BFF-->>Client: HTTP 200 { success: true, data: {...} }
```

### 4. 메시지 전송 (REST Fallback)

WebSocket 연결이 불안정할 때 REST API로 메시지를 전송할 수 있습니다.

```mermaid
sequenceDiagram
    participant Client
    participant BFF as user-api
    participant NATS
    participant Service as chat-service
    participant DB as PostgreSQL

    Client->>BFF: POST /api/user/chat/rooms/{roomId}/messages
    Note right of Client: { content, message_type }

    BFF->>BFF: 메시지 데이터 구성<br/>{ id: uuid(), roomId, senderId,<br/>senderName, content, messageType }
    BFF->>NATS: send('chat.messages.save', messageData)

    NATS->>Service: @MessagePattern('chat.messages.save')
    Service->>DB: 중복 체크 (id로 조회)

    alt 중복 메시지
        DB-->>Service: Existing message
        Service-->>NATS: { success: true, data: existingMsg }
    else 새 메시지
        Service->>DB: prisma.chatMessage.create()
        Service->>DB: prisma.chatRoom.update({ updatedAt })
        DB-->>Service: New ChatMessage
        Service-->>NATS: { success: true, data: newMsg }
    end

    NATS-->>BFF: Response
    BFF-->>Client: HTTP 201 { success: true, data: message }
```

---

## WebSocket 실시간 통신

WebSocket은 실시간 메시지 전송과 수신에 사용됩니다.

### 연결 및 인증

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as chat-gateway
    participant NATS

    Client->>Gateway: WebSocket Connect<br/>/chat?token={JWT}

    Gateway->>Gateway: JWT 검증<br/>jwtService.verifyAsync(token)

    alt 인증 성공
        Gateway->>Gateway: 온라인 사용자 추적<br/>onlineUsers.set(socketId, user)
        Gateway->>NATS: publishPresence(userId, 'online')
        Gateway-->>Client: emit('connected', {<br/>  userId, name, socketId<br/>})
    else 인증 실패
        Gateway-->>Client: emit('error', {<br/>  message: 'Unauthorized'<br/>})
        Gateway->>Client: disconnect()
    end
```

### 채팅방 입장

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as chat-gateway
    participant NATS
    participant OtherClients as 다른 클라이언트

    Client->>Gateway: emit('join_room', { roomId })

    Gateway->>Gateway: Socket.IO room join<br/>client.join(roomId)
    Gateway->>Gateway: 구독 추적<br/>roomSubscriptions.set(roomId, socketId)

    Gateway->>NATS: subscribeToRoom(roomId)
    Note right of NATS: NATS JetStream Consumer 생성<br/>Subject: chat.room.{roomId}.message

    Gateway->>NATS: subscribeToTyping(roomId)
    Note right of NATS: Subject: chat.room.{roomId}.typing

    Gateway->>OtherClients: emit('user_joined', {<br/>  roomId, userId, userName<br/>})

    Gateway-->>Client: callback({ success: true, roomId })
```

### 메시지 전송 (실시간)

```mermaid
sequenceDiagram
    participant Sender as 발신자
    participant Gateway as chat-gateway
    participant NATS
    participant Service as chat-service
    participant DB as PostgreSQL
    participant Receivers as 수신자들

    Sender->>Gateway: emit('send_message', {<br/>  roomId, content, type<br/>})

    Gateway->>Gateway: 메시지 객체 생성<br/>{ id: uuid(), roomId, senderId,<br/>senderName, content, createdAt }

    par 즉시 전달 (실시간)
        Gateway->>Receivers: emit('new_message', message)<br/>via Socket.IO room
    and 영구 저장 (비동기)
        Gateway->>NATS: publishMessage(roomId, message)
        Note right of NATS: JetStream publish<br/>Subject: chat.room.{roomId}.message
        NATS->>Service: Stream consumer가 메시지 수신
        Service->>DB: prisma.chatMessage.create()
    end

    Gateway-->>Sender: callback({<br/>  success: true, message<br/>})
```

### 타이핑 표시

```mermaid
sequenceDiagram
    participant Typer as 타이핑 중인 사용자
    participant Gateway as chat-gateway
    participant NATS
    participant Others as 같은 채팅방 사용자

    Typer->>Gateway: emit('typing', {<br/>  roomId, isTyping: true<br/>})

    Gateway->>Gateway: 타이핑 이벤트 생성<br/>{ roomId, userId, userName, isTyping }

    par Socket.IO 직접 전달
        Gateway->>Others: emit('typing', event)<br/>via client.to(roomId)
    and NATS 발행
        Gateway->>NATS: publishTyping(roomId, event)
        Note right of NATS: Subject: chat.room.{roomId}.typing<br/>TTL: 10초
    end
```

### 연결 해제

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as chat-gateway
    participant NATS
    participant OtherClients as 같은 채팅방 사용자

    Client->>Gateway: disconnect

    Gateway->>Gateway: 온라인 사용자에서 제거<br/>onlineUsers.delete(socketId)
    Gateway->>Gateway: 사용자 소켓에서 제거<br/>userSockets.get(userId).delete(socketId)

    alt 사용자의 마지막 소켓
        Gateway->>NATS: publishPresence(userId, 'offline')
    end

    loop 각 구독 채팅방에 대해
        Gateway->>NATS: unsubscribeFromRoom(roomId, socketId)
        Gateway->>OtherClients: emit('user_left', {<br/>  roomId, userId, userName<br/>})
    end
```

---

## 데이터베이스 스키마

```mermaid
erDiagram
    ChatRoom ||--o{ ChatRoomMember : has
    ChatRoom ||--o{ ChatMessage : contains

    ChatRoom {
        string id PK "UUID"
        string name "nullable - 그룹채팅방 이름"
        enum type "DIRECT | GROUP | BOOKING"
        int bookingId "nullable - 예약 연동"
        datetime createdAt
        datetime updatedAt
    }

    ChatRoomMember {
        string id PK "UUID"
        string roomId FK
        int userId
        string userName "캐시용 비정규화"
        datetime joinedAt
        datetime leftAt "nullable - 나간 시간"
        boolean isAdmin "관리자 여부"
        string lastReadMessageId "nullable"
        datetime lastReadAt "nullable"
    }

    ChatMessage {
        string id PK "UUID"
        string roomId FK
        int senderId
        string senderName "캐시용 비정규화"
        string content
        enum type "TEXT | IMAGE | SYSTEM"
        datetime createdAt
        datetime deletedAt "nullable - soft delete"
    }

    MessageRead {
        string id PK "UUID"
        string messageId
        int userId
        datetime readAt
    }

    ChatMessage ||--o{ MessageRead : "읽음 처리"
```

---

## NATS 메시지 패턴

### Request/Reply 패턴 (REST API용)

| 패턴 | 용도 | Payload |
|------|------|---------|
| `chat.rooms.list` | 채팅방 목록 조회 | `{ userId: number }` |
| `chat.rooms.get` | 채팅방 상세 조회 | `{ roomId: string }` |
| `chat.rooms.create` | 채팅방 생성 | `{ name, type, memberIds, memberNames }` |
| `chat.rooms.removeMember` | 채팅방 나가기 | `{ roomId, userId }` |
| `chat.messages.list` | 메시지 목록 조회 | `{ roomId, limit, skip }` |
| `chat.messages.save` | 메시지 저장 | `{ id, roomId, senderId, content, ... }` |
| `chat.messages.markRead` | 읽음 처리 | `{ roomId, userId, messageId }` |
| `chat.messages.unreadCount` | 안읽은 수 조회 | `{ roomId, userId }` |

### Pub/Sub 패턴 (실시간 통신용)

| Subject | 용도 | Stream |
|---------|------|--------|
| `chat.room.{roomId}.message` | 채팅 메시지 | CHAT_MESSAGES |
| `chat.dm.{userId1}-{userId2}.message` | DM 메시지 | CHAT_MESSAGES |
| `chat.user.{userId}.presence` | 온라인 상태 | CHAT_PRESENCE |
| `chat.room.{roomId}.typing` | 타이핑 표시 | CHAT_TYPING |

### JetStream 스트림 설정

| 스트림 | Subject 패턴 | 보존 기간 | 저장소 |
|--------|-------------|----------|--------|
| CHAT_MESSAGES | `chat.room.*.message`, `chat.dm.*.message` | 30일 | File |
| CHAT_PRESENCE | `chat.user.*.presence` | 5분 | Memory |
| CHAT_TYPING | `chat.room.*.typing` | 10초 | Memory |

---

## 클라이언트 구현 요약

### user-app-web (React)

```typescript
// 연결
chatSocket.connect(token);

// 채팅방 입장
chatSocket.onConnect(() => {
  chatSocket.joinRoom(roomId);
});

// 메시지 수신
chatSocket.onMessage((message) => {
  setMessages(prev => [...prev, message]);
});

// 메시지 전송
const result = await chatSocket.sendMessage(roomId, content);
if (!result) {
  // WebSocket 실패 시 REST API fallback
  await sendMessageMutation.mutateAsync({ roomId, content });
}
```

### user-app-ios (Swift)

```swift
// 연결
ChatSocketManager.shared.connect(token: token)

// 채팅방 입장
ChatSocketManager.shared.joinRoom(roomId: roomId) { success in
    print("Joined room: \(success)")
}

// 메시지 수신
ChatSocketManager.shared.messageReceived
    .receive(on: DispatchQueue.main)
    .sink { message in
        self.messages.append(message)
    }

// 메시지 전송
ChatSocketManager.shared.sendMessage(roomId: roomId, content: content) { message in
    if message == nil {
        // REST API fallback
    }
}
```

---

## 에러 처리

### NATS 연결 실패

```mermaid
flowchart TD
    A[NATS 요청] --> B{연결 상태?}
    B -->|연결됨| C[정상 처리]
    B -->|연결 안됨| D[재연결 시도]
    D --> E{재연결 성공?}
    E -->|성공| C
    E -->|실패| F[에러 응답 반환]
    F --> G["{ success: false, error: 'NATS not connected' }"]
```

### WebSocket 연결 실패

```mermaid
flowchart TD
    A[WebSocket 메시지 전송] --> B{연결 상태?}
    B -->|연결됨| C[WebSocket으로 전송]
    B -->|연결 안됨| D[REST API Fallback]
    C --> E{전송 성공?}
    E -->|성공| F[완료]
    E -->|실패| D
    D --> G[POST /api/user/chat/rooms/{roomId}/messages]
```

---

## 배포 환경

| 서비스 | 개발 환경 | 프로덕션 환경 |
|--------|----------|--------------|
| user-api | `localhost:3001` | Cloud Run |
| chat-gateway | `localhost:3003` | Cloud Run |
| chat-service | `localhost:3004` | Cloud Run |
| NATS | `localhost:4222` | Cloud Run (내부) |
| PostgreSQL | `localhost:5432` | Cloud SQL |

### Cloud Run Cold Start 주의

Cloud Run은 트래픽이 없을 때 인스턴스를 0으로 스케일 다운합니다. 이로 인해:

1. **첫 번째 요청 지연**: chat-service가 cold start 상태일 때 NATS 구독이 아직 완료되지 않아 "No subscribers" 에러 발생 가능
2. **해결 방법**:
   - 최소 인스턴스 수 설정 (`--min-instances=1`)
   - Health check로 서비스 warm-up
   - 클라이언트에서 재시도 로직 구현
