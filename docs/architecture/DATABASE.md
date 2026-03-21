# Park Golf Platform - Database ERD

## 개요

Park Golf 플랫폼은 8개의 독립 마이크로서비스 데이터베이스로 구성됩니다.
서비스 간 데이터 참조는 NATS 메시징을 통해 이루어지며, 직접적인 FK 관계는 없습니다.

| 서비스 | 데이터베이스 | 설명 |
|--------|------------|------|
| iam-service | iam_db | 인증, 사용자, 관리자, 역할/권한, 친구, 메뉴, 계정삭제 이력 |
| course-service | course_db | 골프장, 코스, 홀, 게임, 타임슬롯 |
| booking-service | booking_db | 예약, 결제, 정책, 환불/노쇼, 팀선정/더치페이 |
| saga-service | saga_db | Saga 오케스트레이션, Step 실행 이력, Outbox |
| payment-service | payment_db | 결제(토스페이먼츠), 환불, 빌링키, 분할결제, 웹훅 |
| partner-service | partner_db | 파트너 연동 설정, 코스/슬롯/예약 매핑, 동기화 이력 |
| chat-service | chat_db | 채팅방, 멤버, 메시지 |
| notify-service | notify_db | 알림, 템플릿, 설정 |

---

## 서비스 간 참조 관계

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

direction: right

iam: "IAM Service" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  Company
  User
  Admin
  MenuMaster
}

course: "Course Service" {
  class: group
  style.fill: "#E8F5E9"
  style.stroke: "#4CAF50"

  Club
  Course
  Game
  GameTimeSlot
}

booking: "Booking Service" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  Booking
  TeamSelection
  BookingPayment: "Payment (Booking)"
  GameCache
  SlotCache: "GameTimeSlotCache"
}

payment: "Payment Service" {
  class: group
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"

  Payment
  PaymentSplit
  BillingKey
}

chat: "Chat Service" {
  class: group
  style.fill: "#FFF3E0"
  style.stroke: "#FB8C00"

  ChatRoom
  ChatRoomMember
}

partner: "Partner Service" {
  class: group
  style.fill: "#E0F2F1"
  style.stroke: "#26A69A"

  PartnerConfig
  GameMapping
  SlotMapping
  BookingMapping
}

notify: "Notify Service" {
  class: group
  style.fill: "#ECEFF1"
  style.stroke: "#78909C"

  Notification
}

course.Club -> iam.Company: companyId {style.stroke-dash: 3}
course.Course -> iam.Company: companyId {style.stroke-dash: 3}
booking.Booking -> iam.User: userId {style.stroke-dash: 3}
booking.Booking -> course.GameTimeSlot: gameTimeSlotId {style.stroke-dash: 3}
booking.Booking -> course.Game: gameId {style.stroke-dash: 3}
booking.TeamSelection -> chat.ChatRoom: chatRoomId {style.stroke-dash: 3}
booking.GameCache -> course.Game: gameId {style.stroke-dash: 3}
booking.SlotCache -> course.GameTimeSlot: gameTimeSlotId {style.stroke-dash: 3}
payment.Payment -> iam.User: userId {style.stroke-dash: 3}
payment.Payment -> booking.Booking: bookingId {style.stroke-dash: 3}
payment.PaymentSplit -> booking.Booking: bookingId {style.stroke-dash: 3}
chat.ChatRoom -> booking.Booking: bookingId {style.stroke-dash: 3}
chat.ChatRoomMember -> iam.User: userId {style.stroke-dash: 3}
notify.Notification -> iam.User: userId {style.stroke-dash: 3}
partner.PartnerConfig -> course.Club: clubId {style.stroke-dash: 3}
partner.PartnerConfig -> iam.Company: companyId {style.stroke-dash: 3}
partner.GameMapping -> course.Game: internalGameId {style.stroke-dash: 3}
partner.SlotMapping -> course.GameTimeSlot: internalSlotId {style.stroke-dash: 3}
partner.BookingMapping -> booking.Booking: internalBookingId {style.stroke-dash: 3}
```

---

## 1. IAM Service (iam_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "IAM Service (iam_db)" {
  class: db-title
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"
}

admin: "관리자/인증" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  Company: {
    shape: sql_table
    id: int {constraint: primary_key}
    name: string
    code: string {constraint: unique}
    description: string
    businessNumber: string {constraint: unique}
    companyType: string "PLATFORM/ASSOCIATION/FRANCHISE"
    address: string
    phoneNumber: string
    email: string {constraint: unique}
    website: string
    logoUrl: string
    status: string "ACTIVE/INACTIVE/SUSPENDED/PENDING"
    isActive: boolean
    metadata: json
    createdAt: datetime
    updatedAt: datetime
  }

  Admin: {
    shape: sql_table
    id: int {constraint: primary_key}
    email: string {constraint: unique}
    password: string
    name: string
    phone: string
    department: string
    description: string
    avatarUrl: string
    isActive: boolean
    lastLoginAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  AdminCompany: {
    shape: sql_table
    id: int {constraint: primary_key}
    adminId: int {constraint: foreign_key}
    companyId: int {constraint: foreign_key}
    companyRoleCode: string {constraint: foreign_key}
    isPrimary: boolean
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  AdminRefreshToken: {
    shape: sql_table
    id: int {constraint: primary_key}
    token: string {constraint: unique}
    adminId: int {constraint: foreign_key}
    expiresAt: datetime
    createdAt: datetime
  }

  AdminActivityLog: {
    shape: sql_table
    id: int {constraint: primary_key}
    adminId: int {constraint: foreign_key}
    companyId: int
    action: string
    resource: string
    details: json
    ipAddress: string
    userAgent: string
    createdAt: datetime
  }

  Company -> AdminCompany: "1:N"
  Admin -> AdminCompany: "1:N"
  Admin -> AdminRefreshToken: "1:N"
  Admin -> AdminActivityLog: "1:N"
}

user: "사용자/인증" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  User: {
    shape: sql_table
    id: int {constraint: primary_key}
    email: string {constraint: unique}
    password: string
    passwordChangedAt: datetime
    name: string
    phone: string
    profileImageUrl: string
    roleCode: string {constraint: foreign_key}
    isActive: boolean
    deletionRequestedAt: datetime "계정 삭제 요청일"
    deletionScheduledAt: datetime "계정 삭제 예정일"
    createdAt: datetime
    updatedAt: datetime
  }

  RefreshToken: {
    shape: sql_table
    id: int {constraint: primary_key}
    token: string {constraint: unique}
    userId: int {constraint: foreign_key}
    expiresAt: datetime
    createdAt: datetime
  }

  UserNotificationSetting: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: int {constraint: unique}
    booking: boolean
    chat: boolean
    friend: boolean
    marketing: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  UserDevice: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: int {constraint: foreign_key}
    platform: string "IOS/ANDROID/WEB"
    deviceToken: string
    deviceId: string
    deviceName: string
    isActive: boolean
    lastActiveAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  User -> RefreshToken: "1:N"
  User -> UserNotificationSetting: "1:1"
  User -> UserDevice: "1:N"
}

rbac: "역할/권한 RBAC" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  RoleMaster: {
    shape: sql_table
    code: string {constraint: primary_key}
    name: string
    description: string
    userType: string "ADMIN or USER"
    scope: string "PLATFORM or COMPANY"
    level: int
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  PermissionMaster: {
    shape: sql_table
    code: string {constraint: primary_key}
    name: string
    description: string
    category: string "COMPANY/BOOKING/COURSE/USER/ADMIN/ANALYTICS"
    level: string "low/medium/high"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  RolePermission: {
    shape: sql_table
    roleCode: string {constraint: primary_key}
    permissionCode: string {constraint: primary_key}
    createdAt: datetime
  }

  RoleMaster -> RolePermission: "1:N"
  PermissionMaster -> RolePermission: "1:N"
}

menu: "메뉴 시스템" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  MenuMaster: {
    shape: sql_table
    id: int {constraint: primary_key}
    code: string {constraint: unique}
    name: string
    path: string
    "icon": string
    parentId: int {constraint: foreign_key}
    sortOrder: int
    platformOnly: boolean
    writePermission: string
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  MenuPermission: {
    shape: sql_table
    menuId: int {constraint: primary_key}
    permissionCode: string {constraint: primary_key}
  }

  MenuCompanyType: {
    shape: sql_table
    menuId: int {constraint: primary_key}
    companyType: string {constraint: primary_key}
  }

  MenuMaster -> MenuMaster: "parent-child"
  MenuMaster -> MenuPermission: "1:N"
  MenuMaster -> MenuCompanyType: "1:N"
}

friend: "친구" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  FriendRequest: {
    shape: sql_table
    id: int {constraint: primary_key}
    fromUserId: int {constraint: foreign_key}
    toUserId: int {constraint: foreign_key}
    status: string "PENDING/ACCEPTED/REJECTED"
    message: string
    createdAt: datetime
    updatedAt: datetime
  }

  Friendship: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: int {constraint: foreign_key}
    friendId: int {constraint: foreign_key}
    createdAt: datetime
  }
}

member: "가맹점 회원" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  CompanyMember: {
    shape: sql_table
    id: int {constraint: primary_key}
    companyId: int {constraint: foreign_key}
    userId: int {constraint: foreign_key}
    source: string "BOOKING/MANUAL/WALK_IN"
    memo: string
    isActive: boolean
    joinedAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }
}

history: "삭제 사용자 이력" {
  class: group
  style.fill: "#FFF8E1"
  style.stroke: "#FFB300"

  UserHistory: {
    shape: sql_table
    id: int {constraint: primary_key}
    originalUserId: int {constraint: unique}
    email: string
    name: string
    phone: string
    deletionReason: string
    deletedAt: datetime
    createdAt: datetime
  }
}

# 그룹 간 참조
admin.AdminCompany -> rbac.RoleMaster: "companyRoleCode"
user.User -> rbac.RoleMaster: "roleCode"
user.User -> friend.FriendRequest: "fromUserId, toUserId"
user.User -> friend.Friendship: "userId, friendId"
menu.MenuPermission -> rbac.PermissionMaster: "permissionCode"
member.CompanyMember -> admin.Company: "companyId"
member.CompanyMember -> user.User: "userId"
```

> **그룹 간 참조**: AdminCompany.companyRoleCode -> RoleMaster.code | User.roleCode -> RoleMaster.code | MenuPermission.permissionCode -> PermissionMaster.code | CompanyMember.companyId -> Company.id, userId -> User.id

---

### 1-1. 관리자/인증

---

### 1-2. 사용자/인증

---

### 1-3. 역할/권한 (RBAC)

---

### 1-4. 메뉴 시스템

> **설명**: MenuMaster는 self-relation으로 부모-자식 트리 구조를 형성합니다. MenuPermission은 메뉴 접근에 필요한 권한을 OR 조건으로 매핑하고, MenuCompanyType은 회사 유형별 메뉴 가시성을 제어합니다.

---

### 1-5. 친구

> **참조**: FriendRequest.fromUserId, toUserId -> User.id | Friendship.userId, friendId -> User.id

---

### 1-6. 가맹점 회원

> **설명**: CompanyMember는 가맹점별 회원을 관리합니다. source로 등록 경로를 추적하며, 예약 시 자동 등록(BOOKING), 관리자 수동 등록(MANUAL), 현장 등록(WALK_IN)을 구분합니다. `@@unique([companyId, userId])`로 중복 등록을 방지합니다.

---

### 1-7. 삭제 사용자 이력

> **설명**: 계정 삭제 처리된 사용자의 이력을 보관합니다. `originalUserId`로 원래 사용자를 식별하며, 삭제 사유와 삭제 시점을 기록합니다.

---

## 2. Course Service (course_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Course Service (course_db)" {
  class: db-title
  style.fill: "#E8F5E9"
  style.stroke: "#4CAF50"
}

facility: "골프장/코스" {
  class: group
  style.fill: "#E8F5E9"
  style.stroke: "#4CAF50"

  Club: {
    shape: sql_table
    id: int {constraint: primary_key}
    name: string
    companyId: int "cross-ref: iam_db"
    location: string
    address: string
    phone: string
    email: string
    website: string
    totalHoles: int
    totalCourses: int
    status: string "ACTIVE/INACTIVE/MAINTENANCE/SEASONAL_CLOSED"
    operatingHours: json
    seasonInfo: json
    facilities: string_array
    clubType: string "PUBLIC/PRIVATE (지자체/사설)"
    bookingMode: string "PLATFORM/PARTNER (자체 플랫폼/파트너 연동)"
    latitude: float
    longitude: float
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  Course: {
    shape: sql_table
    id: int {constraint: primary_key}
    name: string
    code: string
    subtitle: string
    description: string
    holeCount: int
    par: int
    totalDistance: int
    difficulty: int
    scenicRating: int
    courseRating: float
    slopeRating: float
    imageUrl: string
    status: string "ACTIVE/INACTIVE/MAINTENANCE"
    clubId: int {constraint: foreign_key}
    companyId: int "cross-ref: iam_db"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  Hole: {
    shape: sql_table
    id: int {constraint: primary_key}
    holeNumber: int
    par: int
    distance: int
    handicap: int
    description: string
    tips: string
    imageUrl: string
    courseId: int {constraint: foreign_key}
    createdAt: datetime
    updatedAt: datetime
  }

  TeeBox: {
    shape: sql_table
    id: int {constraint: primary_key}
    name: string
    color: string
    distance: int
    difficulty: string "BEGINNER/INTERMEDIATE/ADVANCED/PROFESSIONAL"
    holeId: int {constraint: foreign_key}
    createdAt: datetime
    updatedAt: datetime
  }

  Club -> Course: "1:N"
  Course -> Hole: "1:N"
  Hole -> TeeBox: "1:N"
}

game: "게임/스케줄" {
  class: group
  style.fill: "#E8F5E9"
  style.stroke: "#4CAF50"

  Game: {
    shape: sql_table
    id: int {constraint: primary_key}
    name: string
    code: string {constraint: unique}
    description: string
    frontNineCourseId: int {constraint: foreign_key}
    backNineCourseId: int {constraint: foreign_key}
    slotMode: string "TEE_TIME/SESSION"
    totalHoles: int
    estimatedDuration: int
    breakDuration: int
    maxPlayers: int
    basePrice: decimal
    weekendPrice: decimal
    holidayPrice: decimal
    clubId: int {constraint: foreign_key}
    status: string "ACTIVE/INACTIVE/MAINTENANCE"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  GameTimeSlot: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameId: int {constraint: foreign_key}
    date: date
    startTime: string
    endTime: string
    maxPlayers: int
    bookedPlayers: int
    price: decimal
    isPremium: boolean
    status: string "AVAILABLE/FULLY_BOOKED/CLOSED/MAINTENANCE"
    isActive: boolean
    version: int "Optimistic Locking"
    createdAt: datetime
    updatedAt: datetime
  }

  GameWeeklySchedule: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameId: int {constraint: foreign_key}
    dayOfWeek: int "0=Sun ~ 6=Sat"
    startTime: string
    endTime: string
    interval: int
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  ProcessedSlotReservation: {
    shape: sql_table
    id: int {constraint: primary_key}
    bookingId: int "cross-ref: booking_db"
    gameTimeSlotId: int {constraint: foreign_key}
    processedAt: datetime
    expiresAt: datetime
  }

  Game -> GameTimeSlot: "1:N"
  Game -> GameWeeklySchedule: "1:N"
}

# 그룹 간 참조
game.Game -> facility.Course: "frontNineCourseId"
game.Game -> facility.Course: "backNineCourseId"
game.Game -> facility.Club: "clubId"
```

> **그룹 간 참조**: Game.frontNineCourseId, backNineCourseId -> Course.id | Game.clubId -> Club.id

---

### 2-1. 골프장/코스

---

### 2-2. 게임/스케줄

---

## 3. Booking Service (booking_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

direction: down

header: "Booking Service (booking_db)" {
  class: db-title
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"
}

core: "예약/결제" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  Booking: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameTimeSlotId: int "cross-ref: course_db"
    gameId: int "cross-ref: course_db"
    gameName: string "cached"
    gameCode: string "cached"
    frontNineCourseId: int "cached"
    frontNineCourseName: string "cached"
    backNineCourseId: int "cached"
    backNineCourseName: string "cached"
    bookingDate: datetime
    startTime: string
    endTime: string
    clubId: int "cached"
    clubName: string "cached"
    userId: int "cross-ref: iam_db"
    guestName: string
    guestEmail: string
    guestPhone: string
    playerCount: int
    pricePerPerson: decimal
    serviceFee: decimal
    totalPrice: decimal
    status: string "PENDING/SLOT_RESERVED/CONFIRMED/CANCELLED/COMPLETED/NO_SHOW/FAILED"
    paymentMethod: string "onsite/card/dutchpay"
    specialRequests: string
    bookingNumber: string {constraint: unique}
    idempotencyKey: string {constraint: unique}
    notes: string
    sagaFailReason: string
    userEmail: string "cached"
    userName: string "cached"
    userPhone: string "cached"
    groupId: string "GRP-xxx (더치페이 그룹)"
    teamNumber: int "팀 번호"
    teamSelectionId: int "TeamSelection 참조"
    createdAt: datetime
    updatedAt: datetime
  }

  Payment: {
    shape: sql_table
    id: int {constraint: primary_key}
    bookingId: int {constraint: foreign_key}
    amount: decimal
    paymentMethod: string
    paymentStatus: string "PENDING/PAID/FAILED/REFUNDED"
    transactionId: string
    paidAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  BookingHistory: {
    shape: sql_table
    id: int {constraint: primary_key}
    bookingId: int {constraint: foreign_key}
    action: string
    details: json
    userId: int
    createdAt: datetime
  }

  Booking -> Payment: "1:N"
  Booking -> BookingHistory: "1:N"
}

team: "팀 선정 / 더치페이" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  TeamSelection: {
    shape: sql_table
    id: int {constraint: primary_key}
    chatRoomId: string "cross-ref: chat_db"
    groupId: string {constraint: unique}
    bookerId: int "cross-ref: iam_db"
    bookerName: string "cached"
    clubId: int "cross-ref: course_db"
    clubName: string "cached"
    date: string "YYYY-MM-DD"
    teamCount: int
    status: string "SELECTING/READY/BOOKING/COMPLETED/CANCELLED"
    createdAt: datetime
    updatedAt: datetime
  }

  TeamSelectionMember: {
    shape: sql_table
    id: int {constraint: primary_key}
    teamSelectionId: int {constraint: foreign_key}
    teamNumber: int "1, 2, 3..."
    userId: int "cross-ref: iam_db"
    userName: string "cached"
    userEmail: string "cached"
    role: string "BOOKER/MEMBER"
    createdAt: datetime
  }

  BookingParticipant: {
    shape: sql_table
    id: int {constraint: primary_key}
    bookingId: int {constraint: foreign_key}
    userId: int "cross-ref: iam_db"
    userName: string "cached"
    userEmail: string "cached"
    role: string "BOOKER/MEMBER"
    status: string "PENDING/PAID/CANCELLED/REFUNDED"
    amount: int "1인당 금액"
    paidAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  TeamSelection -> TeamSelectionMember: "1:N"
}

cache: "게임 캐시" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  GameCache: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameId: int {constraint: unique}
    name: string
    code: string
    description: string
    frontNineCourseId: int
    frontNineCourseName: string
    backNineCourseId: int
    backNineCourseName: string
    totalHoles: int
    estimatedDuration: int
    breakDuration: int
    maxPlayers: int
    basePrice: decimal
    weekendPrice: decimal
    holidayPrice: decimal
    clubId: int
    clubName: string
    isActive: boolean
    lastSyncAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  GameTimeSlotCache: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameTimeSlotId: int {constraint: unique}
    gameId: int
    gameName: string
    gameCode: string
    frontNineCourseName: string
    backNineCourseName: string
    clubId: int
    clubName: string
    date: date
    startTime: string
    endTime: string
    maxPlayers: int
    bookedPlayers: int
    availablePlayers: int
    isAvailable: boolean
    price: decimal
    isPremium: boolean
    status: string
    lastSyncAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }
}

refund: "환불/노쇼" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  Refund: {
    shape: sql_table
    id: int {constraint: primary_key}
    bookingId: int
    paymentId: int
    originalAmount: decimal
    refundAmount: decimal
    refundRate: int
    refundFee: decimal
    status: string "REQUESTED/PENDING/APPROVED/PROCESSING/COMPLETED/REJECTED"
    cancellationType: string "USER_NORMAL/USER_LATE/USER_LASTMINUTE/ADMIN/SYSTEM"
    cancelReason: string
    cancelledBy: int
    cancelledByType: string
    pgTransactionId: string
    pgRefundId: string
    processedAt: datetime
    processedBy: int
    rejectedReason: string
    createdAt: datetime
    updatedAt: datetime
  }

  UserNoShowRecord: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: int "cross-ref: iam_db"
    bookingId: int
    noShowAt: datetime
    processedBy: int
    notes: string
    isReset: boolean
    resetAt: datetime
    resetBy: int
    resetReason: string
    createdAt: datetime
  }
}

policy: "정책 (PolicyScope: PLATFORM > COMPANY > CLUB)" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  CancellationPolicy: {
    shape: sql_table
    id: int {constraint: primary_key}
    scopeLevel: string "PLATFORM/COMPANY/CLUB"
    companyId: int "nullable"
    clubId: int "nullable"
    name: string
    code: string
    description: string
    allowUserCancel: boolean
    userCancelDeadlineHours: int
    allowSameDayCancel: boolean
    isDefault: boolean
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  RefundPolicy: {
    shape: sql_table
    id: int {constraint: primary_key}
    scopeLevel: string "PLATFORM/COMPANY/CLUB"
    companyId: int "nullable"
    clubId: int "nullable"
    name: string
    code: string
    description: string
    adminCancelRefundRate: int
    systemCancelRefundRate: int
    minRefundAmount: int
    refundFee: int
    refundFeeRate: int
    isDefault: boolean
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  RefundTier: {
    shape: sql_table
    id: int {constraint: primary_key}
    refundPolicyId: int {constraint: foreign_key}
    minHoursBefore: int
    maxHoursBefore: int
    refundRate: int
    "label": string
    createdAt: datetime
    updatedAt: datetime
  }

  NoShowPolicy: {
    shape: sql_table
    id: int {constraint: primary_key}
    scopeLevel: string "PLATFORM/COMPANY/CLUB"
    companyId: int "nullable"
    clubId: int "nullable"
    name: string
    code: string
    description: string
    allowRefundOnNoShow: boolean
    noShowGraceMinutes: int
    countResetDays: int
    isDefault: boolean
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  NoShowPenalty: {
    shape: sql_table
    id: int {constraint: primary_key}
    noShowPolicyId: int {constraint: foreign_key}
    minCount: int
    maxCount: int
    penaltyType: string "WARNING/RESTRICTION/FEE/BLACKLIST"
    restrictionDays: int
    feeAmount: int
    feeRate: int
    "label": string
    "message": string
    createdAt: datetime
    updatedAt: datetime
  }

  OperatingPolicy: {
    shape: sql_table
    id: int {constraint: primary_key}
    scopeLevel: string "PLATFORM/COMPANY/CLUB"
    companyId: int "nullable"
    clubId: int "nullable"
    openTime: string "06:00"
    closeTime: string "18:00"
    lastTeeTime: string
    defaultMaxPlayers: int
    defaultDuration: int
    defaultBreakDuration: int
    defaultSlotInterval: int
    peakSeasonStart: string "MM-DD"
    peakSeasonEnd: string "MM-DD"
    peakPriceRate: int "percent"
    weekendPriceRate: int "percent"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  RefundPolicy -> RefundTier: "1:N"
  NoShowPolicy -> NoShowPenalty: "1:N"
}

outbox: "Outbox / 멱등성" {
  class: group
  style.fill: "#E3F2FD"
  style.stroke: "#1E88E5"

  OutboxEvent: {
    shape: sql_table
    id: int {constraint: primary_key}
    aggregateType: string
    aggregateId: string
    eventType: string
    payload: json
    status: string "PENDING/PROCESSING/SENT/FAILED"
    retryCount: int
    lastError: string
    createdAt: datetime
    processedAt: datetime
  }

  IdempotencyKey: {
    shape: sql_table
    id: int {constraint: primary_key}
    key: string {constraint: unique}
    aggregateType: string
    aggregateId: string
    responseStatus: int
    responseBody: json
    createdAt: datetime
    expiresAt: datetime
  }
}

# 세로 배치
core -> cache: { style.opacity: 0 }
cache -> team: { style.opacity: 0 }
team -> refund: { style.opacity: 0 }
refund -> policy: { style.opacity: 0 }
policy -> outbox: { style.opacity: 0 }

# 그룹 간 참조
refund.Refund -> core.Booking: "bookingId"
refund.Refund -> core.Payment: "paymentId"
refund.UserNoShowRecord -> core.Booking: "bookingId"
outbox.OutboxEvent -> core.Booking: "aggregateId"
team.TeamSelection -> core.Booking: "groupId"
core.Booking -> team.BookingParticipant: "1:N"
```

> **그룹 간 참조**: Refund.bookingId -> Booking.id | Refund.paymentId -> Payment.id | UserNoShowRecord.bookingId -> Booking.id | Booking.groupId -> TeamSelection.groupId

---

### 3-1. 예약/결제

---

### 3-2. 게임 캐시

---

### 3-3. 환불/노쇼

---

### 3-4. 정책

> **정책 스코프**: 모든 정책 모델은 `@@unique([scopeLevel, companyId, clubId])`로 스코프 당 하나의 정책만 허용합니다. resolve 시 Club -> Company -> Platform 순으로 폴백합니다.

---

### 3-5. Outbox / 멱등성

---

### 3-6. 팀 선정 / 더치페이

> **TeamSelection**: 채팅방에서 멤버를 선택하고 팀을 구성하는 과정을 관리합니다. 상태가 `COMPLETED`로 전이되면 각 팀별 Booking이 생성됩니다. `groupId`(GRP-xxx)로 Booking.groupId와 연결됩니다.
> **TeamSelectionMember**: 팀별 멤버 배정 목록. `@@unique([teamSelectionId, teamNumber, userId])`로 중복 방지.
> **BookingParticipant**: 팀별 참여자의 개별 결제 상태. `@@unique([bookingId, userId])`로 중복 방지. 결제 완료 시 `PAID`로 전이.

---

## 4. Payment Service (payment_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Payment Service (payment_db)" {
  class: db-title
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"
}

core: "결제 (토스페이먼츠)" {
  class: group
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"

  Payment: {
    shape: sql_table
    id: int {constraint: primary_key}
    paymentKey: string {constraint: unique}
    orderId: string {constraint: unique}
    orderName: string
    amount: int
    currency: string "KRW"
    method: string "CARD/TRANSFER/VIRTUAL_ACCOUNT/EASY_PAY/MOBILE"
    easyPayProvider: string "TOSSPAY/KAKAOPAY/NAVERPAY"
    cardCompany: string
    cardCompanyName: string
    cardNumber: string "마스킹"
    cardType: string "신용/체크/기프트"
    ownerType: string "개인/법인"
    installmentMonths: int
    isInterestFree: boolean
    virtualAccountNumber: string
    virtualBankCode: string
    virtualBankName: string
    virtualDueDate: datetime
    virtualAccountHolder: string
    transferBankCode: string
    transferBankName: string
    status: string "READY/IN_PROGRESS/WAITING_FOR_DEPOSIT/DONE/CANCELED/PARTIAL_CANCELED/ABORTED/EXPIRED"
    userId: int "cross-ref: iam_db"
    bookingId: int {constraint: unique}
    approvedAt: datetime
    requestedAt: datetime
    cancelledAt: datetime
    cancelReason: string
    cancelAmount: int
    receiptUrl: string
    checkoutUrl: string
    metadata: json
    customerName: string
    customerEmail: string
    customerPhone: string
    createdAt: datetime
    updatedAt: datetime
  }

  Refund: {
    shape: sql_table
    id: int {constraint: primary_key}
    paymentId: int {constraint: foreign_key}
    transactionKey: string {constraint: unique}
    cancelReason: string
    cancelAmount: int
    taxFreeAmount: int
    refundStatus: string "PENDING/PROCESSING/COMPLETED/FAILED"
    refundBankCode: string
    refundBankName: string
    refundAccount: string
    refundHolder: string
    refundedAt: datetime
    requestedBy: int
    requestedByType: string "USER/ADMIN/SYSTEM"
    createdAt: datetime
    updatedAt: datetime
  }

  Payment -> Refund: "1:N"
}

billing: "자동결제" {
  class: group
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"

  BillingKey: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: int "cross-ref: iam_db"
    billingKey: string {constraint: unique}
    customerKey: string
    authenticatedAt: datetime
    cardCompany: string
    cardCompanyName: string
    cardNumber: string "마스킹"
    cardType: string "신용/체크"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }
}

split: "분할결제 (더치페이)" {
  class: group
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"

  PaymentSplit: {
    shape: sql_table
    id: int {constraint: primary_key}
    paymentId: int {constraint: foreign_key}
    bookingGroupId: int "cross-ref: booking_db"
    bookingId: int "cross-ref: booking_db"
    userId: int "cross-ref: iam_db"
    userName: string "cached"
    userEmail: string "cached"
    amount: int "분담 금액"
    status: string "PENDING/PAID/EXPIRED/CANCELLED/REFUNDED"
    orderId: string {constraint: unique}
    paidAt: datetime
    expiredAt: datetime "결제 기한"
    createdAt: datetime
    updatedAt: datetime
  }
}

webhook: "웹훅/Outbox" {
  class: group
  style.fill: "#F3E5F5"
  style.stroke: "#AB47BC"

  WebhookLog: {
    shape: sql_table
    id: int {constraint: primary_key}
    paymentId: int {constraint: foreign_key}
    eventType: string
    payload: json
    status: string "RECEIVED/PROCESSING/PROCESSED/FAILED"
    processedAt: datetime
    errorMessage: string
    createdAt: datetime
  }

  PaymentOutboxEvent: {
    shape: sql_table
    id: int {constraint: primary_key}
    aggregateType: string
    aggregateId: string
    eventType: string
    payload: json
    status: string "PENDING/PROCESSING/SENT/FAILED"
    retryCount: int
    lastError: string
    createdAt: datetime
    processedAt: datetime
  }
}

# 그룹 간 참조
core.Payment -> split.PaymentSplit: "1:N"
webhook.WebhookLog -> core.Payment: "paymentId"
```

> **서비스 간 참조**: Payment.userId -> iam_db.User.id | Payment.bookingId -> booking_db.Booking.id

---

### 4-1. 결제 (토스페이먼츠)

---

### 4-2. 빌링키 (자동결제)

---

### 4-3. 분할결제 (더치페이)

> **PaymentSplit**: 더치페이 참여자별 분할결제 레코드. 각 참여자에게 고유 `orderId`가 발급되며, Toss 결제위젯으로 개별 결제를 진행한다. `@@index([bookingGroupId, status])`, `@@index([bookingId])`, `@@index([userId, status])`

---

### 4-4. 웹훅/Outbox

---

## 5. Saga Service (saga_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Saga Service (saga_db)" {
  class: db-title
  style.fill: "#FCE4EC"
  style.stroke: "#EC407A"
}

saga: "Saga 오케스트레이션" {
  class: group
  style.fill: "#FCE4EC"
  style.stroke: "#EC407A"

  SagaExecution: {
    shape: sql_table
    id: int {constraint: primary_key}
    sagaType: string "CREATE_BOOKING/CANCEL_BOOKING/ADMIN_REFUND/PAYMENT_CONFIRMED/PAYMENT_TIMEOUT"
    correlationId: string {constraint: unique}
    status: string "STARTED/STEP_EXECUTING/STEP_COMPLETED/COMPLETED/STEP_FAILED/COMPENSATING/COMPENSATION_COMPLETED/COMPENSATION_FAILED/FAILED/REQUIRES_MANUAL"
    currentStep: int
    totalSteps: int
    payload: json "Saga 컨텍스트 (공유 데이터)"
    failReason: string
    triggeredBy: string "USER/ADMIN/SYSTEM/SCHEDULER"
    triggeredById: int
    startedAt: datetime
    completedAt: datetime
    failedAt: datetime
  }

  SagaStep: {
    shape: sql_table
    id: int {constraint: primary_key}
    sagaExecutionId: int {constraint: foreign_key}
    stepIndex: int
    stepName: string
    actionPattern: string "NATS 패턴"
    status: string "PENDING/EXECUTING/COMPLETED/FAILED/COMPENSATED/SKIPPED"
    retryCount: int
    requestPayload: json
    responsePayload: json
    errorMessage: string
    isCompensation: boolean
    compensatePattern: string
    startedAt: datetime
    completedAt: datetime
  }

  OutboxEvent: {
    shape: sql_table
    id: int {constraint: primary_key}
    aggregateType: string "SagaExecution"
    aggregateId: string
    eventType: string
    payload: json
    status: string "PENDING/PROCESSING/SENT/FAILED"
    retryCount: int
    lastError: string
    createdAt: datetime
    processedAt: datetime
  }

  SagaExecution -> SagaStep: "1:N"
}
```

### 상세

> **설명**: saga-service는 분산 트랜잭션의 중앙 오케스트레이터입니다. SagaExecution이 전체 Saga 흐름을 추적하고, SagaStep이 개별 Step의 실행/보상 이력을 기록합니다. 실패 시 보상(compensation)이 자동 역순 실행되며, 보상 실패 시 `REQUIRES_MANUAL` 상태로 전이됩니다.

---

## 6. Chat Service (chat_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Chat Service (chat_db)" {
  class: db-title
  style.fill: "#FFF3E0"
  style.stroke: "#FB8C00"
}

chat: "채팅" {
  class: group
  style.fill: "#FFF3E0"
  style.stroke: "#FB8C00"

  ChatRoom: {
    shape: sql_table
    id: uuid {constraint: primary_key}
    name: string
    type: string "DIRECT/CHANNEL/BOOKING"
    bookingId: int "cross-ref: booking_db"
    createdAt: datetime
    updatedAt: datetime
  }

  ChatRoomMember: {
    shape: sql_table
    id: uuid {constraint: primary_key}
    roomId: string {constraint: foreign_key}
    userId: int "cross-ref: iam_db"
    userName: string "cached"
    userEmail: string "cached"
    joinedAt: datetime
    leftAt: datetime
    isAdmin: boolean
    lastReadMessageId: string
    lastReadAt: datetime
  }

  ChatMessage: {
    shape: sql_table
    id: uuid {constraint: primary_key}
    roomId: string {constraint: foreign_key}
    senderId: int "0=AI 브로드캐스트, cross-ref: iam_db"
    senderName: string "cached"
    content: string
    type: string "TEXT/IMAGE/SYSTEM/AI_USER/AI_ASSISTANT"
    metadata: string "nullable, AI 액션 JSON"
    createdAt: datetime
    deletedAt: datetime "soft delete"
  }

  MessageRead: {
    shape: sql_table
    id: uuid {constraint: primary_key}
    messageId: string
    userId: int "cross-ref: iam_db"
    readAt: datetime
  }

  ChatRoom -> ChatRoomMember: "1:N"
  ChatRoom -> ChatMessage: "1:N"
}
```

---

## 7. Notification Service (notify_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Notification Service (notify_db)" {
  class: db-title
  style.fill: "#ECEFF1"
  style.stroke: "#78909C"
}

notify: "알림" {
  class: group
  style.fill: "#ECEFF1"
  style.stroke: "#78909C"

  Notification: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: string "cross-ref: iam_db"
    type: string "BOOKING_CONFIRMED/CANCELLED/REFUND_COMPLETED/PAYMENT_SUCCESS/FAILED/SPLIT_PAYMENT_REQUEST/etc"
    title: string
    message: string
    data: json
    status: string "PENDING/SENT/FAILED/READ"
    deliveryChannel: string "PUSH/EMAIL/SMS"
    retryCount: int
    maxRetries: int
    scheduledAt: datetime
    sentAt: datetime
    readAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  NotificationTemplate: {
    shape: sql_table
    id: int {constraint: primary_key}
    type: string
    title: string
    content: string
    variables: json
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  NotificationSettings: {
    shape: sql_table
    id: int {constraint: primary_key}
    userId: string {constraint: unique}
    email: boolean
    sms: boolean
    push: boolean
    marketing: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  DeadLetterNotification: {
    shape: sql_table
    id: int {constraint: primary_key}
    originalId: int
    userId: string
    type: string
    title: string
    message: string
    data: json
    deliveryChannel: string
    failureReason: string
    retryCount: int
    movedAt: datetime
  }

  Notification -> DeadLetterNotification: "failed"
  NotificationTemplate -> Notification: "type"
}
```

---

## 8. Partner Service (partner_db)

```d2
classes: {
  db-title: {
    style.font-size: 22
    style.bold: true
    style.stroke-width: 2
    style.border-radius: 12
    style.shadow: true
  }
  group: {
    style.border-radius: 8
    style.stroke-width: 1
    style.shadow: true
    style.font-size: 16
    style.bold: true
  }
}

header: "Partner Service (partner_db)" {
  class: db-title
  style.fill: "#E0F2F1"
  style.stroke: "#26A69A"
}

config: "연동 설정" {
  class: group
  style.fill: "#E0F2F1"
  style.stroke: "#26A69A"

  PartnerConfig: {
    shape: sql_table
    id: int {constraint: primary_key}
    clubId: int {constraint: unique}
    companyId: int "cross-ref: iam_db"
    systemName: string "외부 시스템 표시명"
    externalClubId: string {constraint: unique}
    specUrl: string "OpenAPI 스펙 URL"
    apiKey: string "AES-256 암호화"
    apiSecret: string "AES-256 암호화"
    webhookSecret: string "웹훅 서명 검증용"
    responseMapping: json "응답 필드 매핑 설정"
    syncMode: string "API_POLLING/WEBHOOK/HYBRID/MANUAL"
    syncIntervalMin: int "폴링 주기 (기본 10분)"
    syncRangeDays: int "동기화 범위 (기본 7일)"
    slotSyncEnabled: boolean
    bookingSyncEnabled: boolean
    isActive: boolean
    lastSlotSyncAt: datetime
    lastSlotSyncStatus: string "SUCCESS/PARTIAL/FAILED"
    lastSlotSyncError: string
    lastBookingSyncAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  GameMapping: {
    shape: sql_table
    id: int {constraint: primary_key}
    partnerId: int {constraint: foreign_key}
    externalCourseName: string "외부 코스명"
    externalCourseId: string "외부 코스 ID"
    internalGameId: int "cross-ref: course_db Game.id"
    isActive: boolean
    createdAt: datetime
    updatedAt: datetime
  }

  PartnerConfig -> GameMapping: "1:N"
}

mapping: "데이터 매핑" {
  class: group
  style.fill: "#E0F2F1"
  style.stroke: "#26A69A"

  SlotMapping: {
    shape: sql_table
    id: int {constraint: primary_key}
    gameMappingId: int {constraint: foreign_key}
    externalSlotId: string "외부 슬롯 ID"
    date: date
    startTime: string "HH:mm"
    endTime: string "HH:mm"
    internalSlotId: int "cross-ref: course_db GameTimeSlot.id"
    externalMaxPlayers: int
    externalBooked: int "외부 예약 인원"
    externalStatus: string "AVAILABLE/FULLY_BOOKED/CLOSED"
    externalPrice: decimal
    syncStatus: string "SYNCED/PENDING/CONFLICT/UNMAPPED/FAILED"
    syncError: string
    lastSyncAt: datetime
    createdAt: datetime
    updatedAt: datetime
  }

  BookingMapping: {
    shape: sql_table
    id: int {constraint: primary_key}
    partnerId: int "PartnerConfig.id (논리 참조)"
    gameMappingId: int "GameMapping.id"
    internalBookingId: int {constraint: unique}
    externalBookingId: string "외부 예약 ID"
    syncDirection: string "INBOUND/OUTBOUND"
    syncStatus: string "SYNCED/PENDING/CONFLICT/FAILED/CANCELLED"
    lastSyncAt: datetime
    date: date
    startTime: string
    playerCount: int
    playerName: string
    status: string "CONFIRMED/CANCELLED/COMPLETED"
    conflictData: json "충돌 시 양쪽 데이터 스냅샷"
    createdAt: datetime
    updatedAt: datetime
  }
}

log: "동기화 이력" {
  class: group
  style.fill: "#E0F2F1"
  style.stroke: "#26A69A"

  SyncLog: {
    shape: sql_table
    id: int {constraint: primary_key}
    partnerId: int {constraint: foreign_key}
    action: string "SLOT_SYNC/BOOKING_IMPORT/BOOKING_EXPORT/BOOKING_CANCEL/CONNECTION_TEST"
    "direction": string "INBOUND/OUTBOUND"
    status: string "SUCCESS/PARTIAL/FAILED"
    recordCount: int "처리 건수"
    createdCount: int "신규 건수"
    updatedCount: int "갱신 건수"
    errorCount: int "실패 건수"
    errorMessage: string
    durationMs: int "소요 시간 (ms)"
    payload: json "요청/응답 요약 (디버깅용)"
    createdAt: datetime
  }
}

# 그룹 간 참조
config.GameMapping -> mapping.SlotMapping: "1:N"
config.PartnerConfig -> log.SyncLog: "1:N"
mapping.BookingMapping -> config.PartnerConfig: "partnerId" {style.stroke-dash: 3}
```

> **서비스 간 참조**: PartnerConfig.clubId -> course_db.Club.id | PartnerConfig.companyId -> iam_db.Company.id | GameMapping.internalGameId -> course_db.Game.id | SlotMapping.internalSlotId -> course_db.GameTimeSlot.id | BookingMapping.internalBookingId -> booking_db.Booking.id

---

### 8-1. 연동 설정

> **PartnerConfig**: 골프장별 1건의 연동 설정. `BookingMode: PARTNER`인 Club에만 생성됩니다. `@@unique([externalClubId])`, `@@index([isActive, companyId])`
> **GameMapping**: 외부 코스명 <-> 내부 Game ID 매핑. `@@unique([partnerId, externalCourseName])`, `@@unique([partnerId, internalGameId])`

---

### 8-2. 슬롯 매핑

> **SlotMapping**: 외부 슬롯 <-> 내부 GameTimeSlot 매핑. 10분 주기 cron으로 외부 재고 스냅샷을 갱신합니다. `@@unique([gameMappingId, externalSlotId])`, `@@unique([gameMappingId, date, startTime])`

---

### 8-3. 예약 매핑

> **BookingMapping**: 양방향 예약 매핑. INBOUND(외부->내부)는 외부 예약을 파크골프메이트에 반영, OUTBOUND(내부->외부)는 파크골프메이트 예약을 외부에 전파. `@@unique([partnerId, externalBookingId])`

---

### 8-4. 동기화 이력

> **SyncLog**: 동기화 작업별 처리 결과를 기록합니다. job-service의 10분 주기 cron과 수동 동기화 모두 기록됩니다. `@@index([partnerId, createdAt])`, `@@index([action, status])`

---

## Enum 정의 참조

### IAM Service

| Enum | 값 | 설명 |
|------|----|------|
| CompanyType | `PLATFORM`, `ASSOCIATION`, `FRANCHISE` | 회사 유형 |
| CompanyStatus | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING` | 회사 상태 |
| CompanyMemberSource | `BOOKING`, `MANUAL`, `WALK_IN` | 회원 등록 경로 |
| FriendRequestStatus | `PENDING`, `ACCEPTED`, `REJECTED` | 친구 요청 상태 |
| DevicePlatform | `IOS`, `ANDROID`, `WEB` | 디바이스 플랫폼 |

### Course Service

| Enum | 값 | 설명 |
|------|----|------|
| ClubStatus | `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `SEASONAL_CLOSED` | 골프장 상태 |
| ClubType | `PUBLIC`, `PRIVATE` | 골프장 유형 (지자체/사설) |
| BookingMode | `PLATFORM`, `PARTNER` | 부킹 연동 방식 (자체 플랫폼/파트너 연동) |
| CourseStatus | `ACTIVE`, `INACTIVE`, `MAINTENANCE` | 코스 상태 |
| GameStatus | `ACTIVE`, `INACTIVE`, `MAINTENANCE` | 게임 상태 |
| SlotMode | `TEE_TIME`, `SESSION` | 슬롯 모드 |
| TimeSlotStatus | `AVAILABLE`, `FULLY_BOOKED`, `CLOSED`, `MAINTENANCE` | 타임슬롯 상태 |
| TeeBoxLevel | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PROFESSIONAL` | 티박스 난이도 |

### Booking Service

| Enum | 값 | 설명 |
|------|----|------|
| BookingStatus | `PENDING`, `SLOT_RESERVED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, `FAILED` | 예약 상태 |
| PolicyScope | `PLATFORM`, `COMPANY`, `CLUB` | 정책 스코프 (계층형 상속) |
| PaymentStatus | `PENDING`, `PAID`, `FAILED`, `REFUNDED` | 결제 상태 |
| TimeSlotCacheStatus | `AVAILABLE`, `FULLY_BOOKED`, `CLOSED`, `MAINTENANCE` | 슬롯 캐시 상태 |
| OutboxStatus | `PENDING`, `PROCESSING`, `SENT`, `FAILED` | Outbox 이벤트 상태 |
| RefundStatus | `REQUESTED`, `PENDING`, `APPROVED`, `PROCESSING`, `COMPLETED`, `REJECTED` | 환불 상태 |
| CancellationType | `USER_NORMAL`, `USER_LATE`, `USER_LASTMINUTE`, `ADMIN`, `SYSTEM` | 취소 유형 |
| NoShowPenaltyType | `WARNING`, `RESTRICTION`, `FEE`, `BLACKLIST` | 노쇼 페널티 |
| TeamSelectionStatus | `SELECTING`, `READY`, `BOOKING`, `COMPLETED`, `CANCELLED` | 팀 선정 상태 |
| ParticipantRole | `BOOKER`, `MEMBER` | 참여자 역할 |
| ParticipantStatus | `PENDING`, `PAID`, `CANCELLED`, `REFUNDED` | 참여자 결제 상태 |

### Saga Service

| Enum | 값 | 설명 |
|------|----|------|
| SagaStatus | `STARTED`, `STEP_EXECUTING`, `STEP_COMPLETED`, `COMPLETED`, `STEP_FAILED`, `COMPENSATING`, `COMPENSATION_COMPLETED`, `COMPENSATION_FAILED`, `FAILED`, `REQUIRES_MANUAL` | Saga 실행 상태 |
| StepStatus | `PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `COMPENSATED`, `SKIPPED` | Step 실행 상태 |
| OutboxStatus | `PENDING`, `PROCESSING`, `SENT`, `FAILED` | Outbox 이벤트 상태 |

### Payment Service

| Enum | 값 | 설명 |
|------|----|------|
| PaymentMethod | `CARD`, `TRANSFER`, `VIRTUAL_ACCOUNT`, `EASY_PAY`, `MOBILE`, `GIFT_CERTIFICATE`, `CULTURE_GIFT` | 결제 수단 |
| PaymentStatus | `READY`, `IN_PROGRESS`, `WAITING_FOR_DEPOSIT`, `DONE`, `CANCELED`, `PARTIAL_CANCELED`, `ABORTED`, `EXPIRED` | 결제 상태 (토스) |
| RefundStatus | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` | 환불 상태 |
| RefundRequestorType | `USER`, `ADMIN`, `SYSTEM` | 환불 요청자 유형 |
| WebhookStatus | `RECEIVED`, `PROCESSING`, `PROCESSED`, `FAILED` | 웹훅 상태 |
| OutboxStatus | `PENDING`, `PROCESSING`, `SENT`, `FAILED` | Outbox 이벤트 상태 |
| SplitStatus | `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`, `REFUNDED` | 분할결제 상태 |

### Partner Service

| Enum | 값 | 설명 |
|------|----|------|
| SyncMode | `API_POLLING`, `WEBHOOK`, `HYBRID`, `MANUAL` | 동기화 모드 |
| SyncResult | `SUCCESS`, `PARTIAL`, `FAILED` | 동기화 결과 |
| SyncAction | `SLOT_SYNC`, `BOOKING_IMPORT`, `BOOKING_EXPORT`, `BOOKING_CANCEL`, `CONNECTION_TEST` | 동기화 작업 유형 |
| SyncDirection | `INBOUND`, `OUTBOUND` | 동기화 방향 |
| SlotSyncStatus | `SYNCED`, `PENDING`, `CONFLICT`, `UNMAPPED`, `FAILED` | 슬롯 동기화 상태 |
| BookingSyncStatus | `SYNCED`, `PENDING`, `CONFLICT`, `FAILED`, `CANCELLED` | 예약 동기화 상태 |

### Chat Service

| Enum | 값 | 설명 |
|------|----|------|
| RoomType | `DIRECT`, `CHANNEL`, `BOOKING` | 채팅방 유형 |
| MessageType | `TEXT`, `IMAGE`, `SYSTEM`, `AI_USER`, `AI_ASSISTANT` | 메시지 유형 (DB 컬럼: `type`, 서비스 간: `messageType`) |

### Notification Service

| Enum | 값 | 설명 |
|------|----|------|
| NotificationType | `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `REFUND_COMPLETED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `FRIEND_REQUEST`, `FRIEND_ACCEPTED`, `CHAT_MESSAGE`, `SYSTEM_ALERT`, `SPLIT_PAYMENT_REQUEST` | 알림 유형 |
| NotificationStatus | `PENDING`, `SENT`, `FAILED`, `READ` | 알림 상태 |
| DeliveryChannelType | `PUSH`, `EMAIL`, `SMS` | 알림 전달 채널 |

---

## 테이블 통계 요약

| 데이터베이스 | 모델 수 | 주요 모델 |
|------------|---------|----------|
| iam_db | 19 | Company, Admin, User, RoleMaster, MenuMaster, CompanyMember, UserHistory |
| course_db | 8 | Club, Course, Hole, TeeBox, Game, GameTimeSlot |
| booking_db | 18 | Booking, TeamSelection, TeamSelectionMember, BookingParticipant, Refund, CancellationPolicy, OutboxEvent |
| saga_db | 3 | SagaExecution, SagaStep, OutboxEvent |
| payment_db | 6 | Payment, PaymentSplit, Refund, BillingKey, WebhookLog, PaymentOutboxEvent |
| partner_db | 5 | PartnerConfig, GameMapping, SlotMapping, BookingMapping, SyncLog |
| chat_db | 4 | ChatRoom, ChatRoomMember, ChatMessage, MessageRead |
| notify_db | 4 | Notification, NotificationTemplate, NotificationSettings, DeadLetterNotification |
| **합계** | **67** | |
