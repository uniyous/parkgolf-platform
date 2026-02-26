import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoomService, CreateRoomDto, AddMemberDto } from './room.service';
import { NatsResponse } from '../common/types/response.types';

@Controller()
export class RoomNatsController {
  private readonly logger = new Logger(RoomNatsController.name);

  constructor(private readonly roomService: RoomService) {}

  @MessagePattern('chat.rooms.create')
  async createRoom(@Payload() data: CreateRoomDto) {
    this.logger.debug(`Creating room: ${JSON.stringify(data)}`);
    const room = await this.roomService.createRoom(data);
    return NatsResponse.success(room);
  }

  @MessagePattern('chat.rooms.get')
  async getRoom(@Payload() data: { roomId: string }) {
    const room = await this.roomService.getRoom(data.roomId);
    return NatsResponse.success(room);
  }

  @MessagePattern('chat.rooms.list')
  async getUserRooms(@Payload() data: { userId: number }) {
    const rooms = await this.roomService.getUserRooms(data.userId);
    return NatsResponse.success(rooms);
  }

  @MessagePattern('chat.rooms.addMember')
  async addMember(@Payload() data: AddMemberDto) {
    const member = await this.roomService.addMember(data);
    return NatsResponse.success(member);
  }

  @MessagePattern('chat.rooms.removeMember')
  async removeMember(@Payload() data: { roomId: string; userId: number }) {
    await this.roomService.removeMember(data.roomId, data.userId);
    return NatsResponse.success(null);
  }

  @MessagePattern('chat.rooms.checkMembership')
  async checkMembership(@Payload() data: { roomId: string; userId: number }) {
    const member = await this.roomService.checkMembership(data.roomId, data.userId);
    return NatsResponse.success({ isMember: !!member });
  }

  @MessagePattern('chat.room.getMembers')
  async getMembers(@Payload() data: { roomId: string }) {
    const members = await this.roomService.getMembers(data.roomId);
    return NatsResponse.success(members);
  }

  @MessagePattern('chat.rooms.booking')
  async getOrCreateBookingRoom(@Payload() data: { bookingId: number; members: { id: number; name: string }[] }) {
    const room = await this.roomService.getOrCreateBookingRoom(data.bookingId, data.members);
    return NatsResponse.success(room);
  }
}
