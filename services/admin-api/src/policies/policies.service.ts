import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import {
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
  CreateNoShowPolicyDto,
  UpdateNoShowPolicyDto,
  PolicyFilterDto,
} from './dto/policy.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // =====================================================
  // Cancellation Policy
  // =====================================================

  async getCancellationPolicies(filter?: PolicyFilterDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching cancellation policies');
    return this.natsClient.send('policy.cancellation.list', { filter }, NATS_TIMEOUTS.QUICK);
  }

  async getCancellationPolicyById(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching cancellation policy: ${id}`);
    return this.natsClient.send('policy.cancellation.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getDefaultCancellationPolicy(clubId?: number): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching default cancellation policy');
    return this.natsClient.send('policy.cancellation.getDefault', { clubId }, NATS_TIMEOUTS.QUICK);
  }

  async createCancellationPolicy(dto: CreateCancellationPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Creating cancellation policy');
    return this.natsClient.send('policy.cancellation.create', dto, NATS_TIMEOUTS.QUICK);
  }

  async updateCancellationPolicy(
    id: number,
    dto: UpdateCancellationPolicyDto,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`Updating cancellation policy: ${id}`);
    return this.natsClient.send('policy.cancellation.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async deleteCancellationPolicy(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Deleting cancellation policy: ${id}`);
    return this.natsClient.send('policy.cancellation.delete', { id }, NATS_TIMEOUTS.QUICK);
  }

  // =====================================================
  // Refund Policy
  // =====================================================

  async getRefundPolicies(filter?: PolicyFilterDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching refund policies');
    return this.natsClient.send('policy.refund.list', { filter }, NATS_TIMEOUTS.QUICK);
  }

  async getRefundPolicyById(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching refund policy: ${id}`);
    return this.natsClient.send('policy.refund.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getDefaultRefundPolicy(clubId?: number): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching default refund policy');
    return this.natsClient.send('policy.refund.getDefault', { clubId }, NATS_TIMEOUTS.QUICK);
  }

  async createRefundPolicy(dto: CreateRefundPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Creating refund policy');
    return this.natsClient.send('policy.refund.create', dto, NATS_TIMEOUTS.QUICK);
  }

  async updateRefundPolicy(id: number, dto: UpdateRefundPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log(`Updating refund policy: ${id}`);
    return this.natsClient.send('policy.refund.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async deleteRefundPolicy(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Deleting refund policy: ${id}`);
    return this.natsClient.send('policy.refund.delete', { id }, NATS_TIMEOUTS.QUICK);
  }

  async calculateRefund(
    policyId: number,
    originalAmount: number,
    hoursBeforeBooking: number,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log('Calculating refund amount');
    return this.natsClient.send(
      'policy.refund.calculate',
      { policyId, originalAmount, hoursBeforeBooking },
      NATS_TIMEOUTS.QUICK,
    );
  }

  // =====================================================
  // No-Show Policy
  // =====================================================

  async getNoShowPolicies(filter?: PolicyFilterDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching no-show policies');
    return this.natsClient.send('policy.noshow.list', { filter }, NATS_TIMEOUTS.QUICK);
  }

  async getNoShowPolicyById(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching no-show policy: ${id}`);
    return this.natsClient.send('policy.noshow.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getDefaultNoShowPolicy(clubId?: number): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching default no-show policy');
    return this.natsClient.send('policy.noshow.getDefault', { clubId }, NATS_TIMEOUTS.QUICK);
  }

  async createNoShowPolicy(dto: CreateNoShowPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Creating no-show policy');
    return this.natsClient.send('policy.noshow.create', dto, NATS_TIMEOUTS.QUICK);
  }

  async updateNoShowPolicy(id: number, dto: UpdateNoShowPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log(`Updating no-show policy: ${id}`);
    return this.natsClient.send('policy.noshow.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async deleteNoShowPolicy(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Deleting no-show policy: ${id}`);
    return this.natsClient.send('policy.noshow.delete', { id }, NATS_TIMEOUTS.QUICK);
  }

  async getUserNoShowCount(userId: number, clubId?: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching user no-show count: ${userId}`);
    return this.natsClient.send(
      'policy.noshow.getUserCount',
      { userId, clubId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  async getApplicablePenalty(userId: number, clubId?: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching applicable penalty for user: ${userId}`);
    return this.natsClient.send(
      'policy.noshow.getApplicablePenalty',
      { userId, clubId },
      NATS_TIMEOUTS.QUICK,
    );
  }
}
