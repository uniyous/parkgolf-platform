import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingGroupService, CreateBookingGroupDto } from '../service/booking-group.service';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class BookingGroupNatsController {
  private readonly logger = new Logger(BookingGroupNatsController.name);

  constructor(private readonly bookingGroupService: BookingGroupService) {}

  @MessagePattern('bookingGroup.create')
  async createBookingGroup(@Payload() data: CreateBookingGroupDto) {
    this.logger.log(`Creating booking group: ${data.teams.length} teams for club ${data.clubId}`);
    const result = await this.bookingGroupService.createBookingGroup(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('bookingGroup.get')
  async getBookingGroup(@Payload() data: { id?: number; groupNumber?: string }) {
    if (data.groupNumber) {
      const group = await this.bookingGroupService.getBookingGroupByNumber(data.groupNumber);
      return NatsResponse.success(group);
    }
    const group = await this.bookingGroupService.getBookingGroup(data.id!);
    return NatsResponse.success(group);
  }

  @MessagePattern('booking.participant.paid')
  async markParticipantPaid(@Payload() data: { bookingId: number; userId: number }) {
    this.logger.log(`Marking participant paid: booking=${data.bookingId}, user=${data.userId}`);
    const result = await this.bookingGroupService.markParticipantPaid(data.bookingId, data.userId);
    return NatsResponse.success(result);
  }

  @MessagePattern('bookingGroup.cancel')
  async cancelBookingGroup(@Payload() data: { groupId: number }) {
    this.logger.log(`Cancelling booking group: ${data.groupId}`);
    const result = await this.bookingGroupService.cancelBookingGroup(data.groupId);
    return NatsResponse.success(result);
  }
}
