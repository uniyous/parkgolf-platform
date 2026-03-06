-- RoomType enum: GROUP -> CHANNEL
ALTER TYPE "RoomType" ADD VALUE IF NOT EXISTS 'CHANNEL';

-- Migrate existing data
UPDATE chat_rooms SET type = 'CHANNEL' WHERE type = 'GROUP';
