// ==============================================
// chat-service / chat_db — Drizzle schema (UNI-83)
// 컬럼명은 기존 Prisma(@map 없음 → camelCase) 그대로 유지 → DB 무변경.
// String → text, DateTime → timestamp(3). id는 app-side uuid 생성($defaultFn).
// ==============================================
import { pgTable, pgEnum, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ROOM_TYPE_VALUES, MESSAGE_TYPE_VALUES } from '../contracts/enums';

// PG enum 타입명은 기존 DB(Prisma 생성)와 동일하게 'RoomType'/'MessageType'
export const roomTypeEnum = pgEnum('RoomType', ROOM_TYPE_VALUES);
export const messageTypeEnum = pgEnum('MessageType', MESSAGE_TYPE_VALUES);

export const chatRooms = pgTable(
  'chat_rooms',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    name: text('name'),
    type: roomTypeEnum('type').notNull().default('CHANNEL'),
    bookingId: integer('bookingId'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    // Prisma @updatedAt 컬럼은 DB 디폴트가 없음(app 관리) → defaultNow(DEFAULT emit) 금지, $defaultFn으로 값 주입
    updatedAt: timestamp('updatedAt', { precision: 3 })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => [index('chat_rooms_bookingId_idx').on(t.bookingId), index('chat_rooms_type_bookingId_idx').on(t.type, t.bookingId)],
);

export const chatRoomMembers = pgTable(
  'chat_room_members',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    roomId: text('roomId')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
    userId: integer('userId').notNull(),
    userName: text('userName').notNull(),
    userEmail: text('userEmail'),
    joinedAt: timestamp('joinedAt', { precision: 3 }).notNull().defaultNow(),
    leftAt: timestamp('leftAt', { precision: 3 }),
    isAdmin: boolean('isAdmin').notNull().default(false),
    lastReadMessageId: text('lastReadMessageId'),
    lastReadAt: timestamp('lastReadAt', { precision: 3 }),
  },
  (t) => [
    uniqueIndex('chat_room_members_roomId_userId_key').on(t.roomId, t.userId),
    index('chat_room_members_userId_leftAt_idx').on(t.userId, t.leftAt),
  ],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    roomId: text('roomId')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
    senderId: integer('senderId').notNull(),
    senderName: text('senderName').notNull(),
    content: text('content').notNull(),
    type: messageTypeEnum('type').notNull().default('TEXT'),
    metadata: text('metadata'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    deletedAt: timestamp('deletedAt', { precision: 3 }),
  },
  (t) => [
    index('chat_messages_roomId_deletedAt_createdAt_idx').on(t.roomId, t.deletedAt, t.createdAt),
    index('chat_messages_senderId_idx').on(t.senderId),
  ],
);

export const messageReads = pgTable(
  'message_reads',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    messageId: text('messageId').notNull(),
    userId: integer('userId').notNull(),
    readAt: timestamp('readAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('message_reads_messageId_userId_key').on(t.messageId, t.userId),
    index('message_reads_userId_idx').on(t.userId),
  ],
);

// 관계 (db.query ... with 사용)
export const chatRoomsRelations = relations(chatRooms, ({ many }) => ({
  members: many(chatRoomMembers),
  messages: many(chatMessages),
}));
export const chatRoomMembersRelations = relations(chatRoomMembers, ({ one }) => ({
  room: one(chatRooms, { fields: [chatRoomMembers.roomId], references: [chatRooms.id] }),
}));
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(chatRooms, { fields: [chatMessages.roomId], references: [chatRooms.id] }),
}));

export type ChatRoomRow = typeof chatRooms.$inferSelect;
export type ChatRoomMemberRow = typeof chatRoomMembers.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
