import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  TeamSelectionService,
  CreateTeamSelectionDto,
  AddTeamMembersDto,
} from '../service/team-selection.service';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class TeamSelectionNatsController {
  private readonly logger = new Logger(TeamSelectionNatsController.name);

  constructor(private readonly teamSelectionService: TeamSelectionService) {}

  @MessagePattern('teamSelection.create')
  async create(@Payload() data: CreateTeamSelectionDto) {
    this.logger.log(`Creating team selection for club ${data.clubId}, date ${data.date}`);
    const result = await this.teamSelectionService.create(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('teamSelection.addMembers')
  async addMembers(@Payload() data: AddTeamMembersDto) {
    this.logger.log(`Adding ${data.members.length} members to team ${data.teamNumber}`);
    const result = await this.teamSelectionService.addMembers(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('teamSelection.get')
  async get(@Payload() data: { id?: number; groupId?: string }) {
    const result = await this.teamSelectionService.get(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('teamSelection.ready')
  async ready(@Payload() data: { id?: number; groupId?: string }) {
    this.logger.log(`Marking team selection ready: ${JSON.stringify(data)}`);
    const result = await this.teamSelectionService.ready(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('teamSelection.cancel')
  async cancel(@Payload() data: { id?: number; groupId?: string }) {
    this.logger.log(`Cancelling team selection: ${JSON.stringify(data)}`);
    const result = await this.teamSelectionService.cancel(data);
    return NatsResponse.success(result);
  }

  @MessagePattern('booking.participant.paid')
  async markParticipantPaid(@Payload() data: { bookingId: number; userId: number }) {
    this.logger.log(`Marking participant paid: booking=${data.bookingId}, user=${data.userId}`);
    const result = await this.teamSelectionService.markParticipantPaid(data.bookingId, data.userId);
    return NatsResponse.success(result);
  }

  @MessagePattern('bookingGroup.cancel')
  async cancelGroupBookings(@Payload() data: { groupId: string }) {
    this.logger.log(`Cancelling group bookings: groupId=${data.groupId}`);
    const result = await this.teamSelectionService.cancelGroupBookings(data.groupId);
    return NatsResponse.success(result);
  }
}
