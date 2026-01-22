import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PolicyService } from '../service/policy.service';
import {
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
  CreateNoShowPolicyDto,
  UpdateNoShowPolicyDto,
  PolicyFilterDto,
} from '../dto/policy.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(private readonly policyService: PolicyService) {}

  // =====================================================
  // Cancellation Policy Endpoints
  // =====================================================

  @MessagePattern('policy.cancellation.list')
  async listCancellationPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    this.logger.log('NATS: Received policy.cancellation.list request');
    const policies = await this.policyService.getCancellationPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.cancellation.findById')
  async getCancellationPolicyById(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.cancellation.findById request for ID: ${data.id}`);
    const policy = await this.policyService.getCancellationPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.getDefault')
  async getDefaultCancellationPolicy(@Payload() data: { clubId?: number }) {
    this.logger.log(`NATS: Received policy.cancellation.getDefault request`);
    const policy = await this.policyService.getDefaultCancellationPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.create')
  async createCancellationPolicy(@Payload() data: CreateCancellationPolicyDto) {
    this.logger.log(`NATS: Received policy.cancellation.create request`);
    const policy = await this.policyService.createCancellationPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.update')
  async updateCancellationPolicy(
    @Payload() data: { id: number; dto: UpdateCancellationPolicyDto },
  ) {
    this.logger.log(`NATS: Received policy.cancellation.update request for ID: ${data.id}`);
    const policy = await this.policyService.updateCancellationPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.delete')
  async deleteCancellationPolicy(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.cancellation.delete request for ID: ${data.id}`);
    const policy = await this.policyService.deleteCancellationPolicy(data.id);
    return NatsResponse.success(policy);
  }

  // =====================================================
  // Refund Policy Endpoints
  // =====================================================

  @MessagePattern('policy.refund.list')
  async listRefundPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    this.logger.log('NATS: Received policy.refund.list request');
    const policies = await this.policyService.getRefundPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.refund.findById')
  async getRefundPolicyById(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.refund.findById request for ID: ${data.id}`);
    const policy = await this.policyService.getRefundPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.getDefault')
  async getDefaultRefundPolicy(@Payload() data: { clubId?: number }) {
    this.logger.log(`NATS: Received policy.refund.getDefault request`);
    const policy = await this.policyService.getDefaultRefundPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.create')
  async createRefundPolicy(@Payload() data: CreateRefundPolicyDto) {
    this.logger.log(`NATS: Received policy.refund.create request`);
    const policy = await this.policyService.createRefundPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.update')
  async updateRefundPolicy(@Payload() data: { id: number; dto: UpdateRefundPolicyDto }) {
    this.logger.log(`NATS: Received policy.refund.update request for ID: ${data.id}`);
    const policy = await this.policyService.updateRefundPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.delete')
  async deleteRefundPolicy(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.refund.delete request for ID: ${data.id}`);
    const policy = await this.policyService.deleteRefundPolicy(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.calculate')
  async calculateRefund(
    @Payload() data: { policyId: number; originalAmount: number; hoursBeforeBooking: number },
  ) {
    this.logger.log(`NATS: Received policy.refund.calculate request`);
    const result = await this.policyService.calculateRefundAmount(
      data.policyId,
      data.originalAmount,
      data.hoursBeforeBooking,
    );
    return NatsResponse.success(result);
  }

  // =====================================================
  // No-Show Policy Endpoints
  // =====================================================

  @MessagePattern('policy.noshow.list')
  async listNoShowPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    this.logger.log('NATS: Received policy.noshow.list request');
    const policies = await this.policyService.getNoShowPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.noshow.findById')
  async getNoShowPolicyById(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.noshow.findById request for ID: ${data.id}`);
    const policy = await this.policyService.getNoShowPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.getDefault')
  async getDefaultNoShowPolicy(@Payload() data: { clubId?: number }) {
    this.logger.log(`NATS: Received policy.noshow.getDefault request`);
    const policy = await this.policyService.getDefaultNoShowPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.create')
  async createNoShowPolicy(@Payload() data: CreateNoShowPolicyDto) {
    this.logger.log(`NATS: Received policy.noshow.create request`);
    const policy = await this.policyService.createNoShowPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.update')
  async updateNoShowPolicy(@Payload() data: { id: number; dto: UpdateNoShowPolicyDto }) {
    this.logger.log(`NATS: Received policy.noshow.update request for ID: ${data.id}`);
    const policy = await this.policyService.updateNoShowPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.delete')
  async deleteNoShowPolicy(@Payload() data: { id: number }) {
    this.logger.log(`NATS: Received policy.noshow.delete request for ID: ${data.id}`);
    const policy = await this.policyService.deleteNoShowPolicy(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.getUserCount')
  async getUserNoShowCount(@Payload() data: { userId: number; clubId?: number }) {
    this.logger.log(`NATS: Received policy.noshow.getUserCount request for user: ${data.userId}`);
    const count = await this.policyService.getUserNoShowCount(data.userId, data.clubId);
    return NatsResponse.success({ userId: data.userId, noShowCount: count });
  }

  @MessagePattern('policy.noshow.getApplicablePenalty')
  async getApplicablePenalty(@Payload() data: { userId: number; clubId?: number }) {
    this.logger.log(
      `NATS: Received policy.noshow.getApplicablePenalty request for user: ${data.userId}`,
    );
    const result = await this.policyService.getApplicablePenalty(data.userId, data.clubId);
    return NatsResponse.success(result);
  }
}
