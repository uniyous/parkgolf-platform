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
  CreateOperatingPolicyDto,
  UpdateOperatingPolicyDto,
  PolicyFilterDto,
  PolicyResolveQueryDto,
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

  async resolveCancellationPolicy(query: PolicyResolveQueryDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Resolving cancellation policy');
    return this.natsClient.send('policy.cancellation.resolve', query, NATS_TIMEOUTS.QUICK);
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

  async resolveRefundPolicy(query: PolicyResolveQueryDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Resolving refund policy');
    return this.natsClient.send('policy.refund.resolve', query, NATS_TIMEOUTS.QUICK);
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

  async resolveNoShowPolicy(query: PolicyResolveQueryDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Resolving no-show policy');
    return this.natsClient.send('policy.noshow.resolve', query, NATS_TIMEOUTS.QUICK);
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

  async getUserNoShowCount(
    userId: number,
    clubId?: number,
    companyId?: number,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching user no-show count: ${userId}`);
    return this.natsClient.send(
      'policy.noshow.getUserCount',
      { userId, clubId, companyId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  async getApplicablePenalty(
    userId: number,
    clubId?: number,
    companyId?: number,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching applicable penalty for user: ${userId}`);
    return this.natsClient.send(
      'policy.noshow.getApplicablePenalty',
      { userId, clubId, companyId },
      NATS_TIMEOUTS.QUICK,
    );
  }

  // =====================================================
  // Operating Policy
  // =====================================================

  async getOperatingPolicies(filter?: PolicyFilterDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Fetching operating policies');
    return this.natsClient.send('policy.operating.list', { filter }, NATS_TIMEOUTS.QUICK);
  }

  async getOperatingPolicyById(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Fetching operating policy: ${id}`);
    return this.natsClient.send('policy.operating.findById', { id }, NATS_TIMEOUTS.QUICK);
  }

  async resolveOperatingPolicy(query: PolicyResolveQueryDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Resolving operating policy');
    return this.natsClient.send('policy.operating.resolve', query, NATS_TIMEOUTS.QUICK);
  }

  async createOperatingPolicy(dto: CreateOperatingPolicyDto): Promise<ApiResponse<unknown>> {
    this.logger.log('Creating operating policy');
    return this.natsClient.send('policy.operating.create', dto, NATS_TIMEOUTS.QUICK);
  }

  async updateOperatingPolicy(
    id: number,
    dto: UpdateOperatingPolicyDto,
  ): Promise<ApiResponse<unknown>> {
    this.logger.log(`Updating operating policy: ${id}`);
    return this.natsClient.send('policy.operating.update', { id, dto }, NATS_TIMEOUTS.QUICK);
  }

  async deleteOperatingPolicy(id: number): Promise<ApiResponse<unknown>> {
    this.logger.log(`Deleting operating policy: ${id}`);
    return this.natsClient.send('policy.operating.delete', { id }, NATS_TIMEOUTS.QUICK);
  }
}
