import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoomService, CreateRoomDto, AddMemberDto } from './room.service';

@Controller()
export class RoomNatsController {
  private readonly logger = new Logger(RoomNatsController.name);

  constructor(private readonly roomService: RoomService) {}

  @MessagePattern('chat.rooms.create')
  async createRoom(@Payload() data: CreateRoomDto) {
    this.logger.debug(`Creating room: ${JSON.stringify(data)}`);
    try {
      const room = await this.roomService.createRoom(data);
      return { success: true, data: room };
    } catch (error: any) {
      this.logger.error(`Failed to create room: ${error.message}`);
      return { success: false, error: { code: 'CREATE_ROOM_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.rooms.get')
  async getRoom(@Payload() data: { roomId: string }) {
    try {
      const room = await this.roomService.getRoom(data.roomId);
      if (!room) {
        return { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } };
      }
      return { success: true, data: room };
    } catch (error: any) {
      return { success: false, error: { code: 'GET_ROOM_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.rooms.list')
  async getUserRooms(@Payload() data: { userId: number }) {
    try {
      const rooms = await this.roomService.getUserRooms(data.userId);
      return { success: true, data: rooms };
    } catch (error: any) {
      return { success: false, error: { code: 'LIST_ROOMS_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.rooms.addMember')
  async addMember(@Payload() data: AddMemberDto) {
    try {
      const member = await this.roomService.addMember(data);
      return { success: true, data: member };
    } catch (error: any) {
      return { success: false, error: { code: 'ADD_MEMBER_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.rooms.removeMember')
  async removeMember(@Payload() data: { roomId: string; userId: number }) {
    try {
      await this.roomService.removeMember(data.roomId, data.userId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: { code: 'REMOVE_MEMBER_ERROR', message: error.message } };
    }
  }

  @MessagePattern('chat.rooms.booking')
  async getOrCreateBookingRoom(@Payload() data: { bookingId: number; members: { id: number; name: string }[] }) {
    try {
      const room = await this.roomService.getOrCreateBookingRoom(data.bookingId, data.members);
      return { success: true, data: room };
    } catch (error: any) {
      return { success: false, error: { code: 'BOOKING_ROOM_ERROR', message: error.message } };
    }
  }
}
