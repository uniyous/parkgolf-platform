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
  CreateOperatingPolicyDto,
  UpdateOperatingPolicyDto,
  PolicyFilterDto,
  PolicyResolveDto,
} from '../dto/policy.dto';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class PolicyNatsController {
  private readonly logger = new Logger(PolicyNatsController.name);

  constructor(private readonly policyService: PolicyService) {}

  // =====================================================
  // Cancellation Policy Endpoints
  // =====================================================

  @MessagePattern('policy.cancellation.list')
  async listCancellationPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    const policies = await this.policyService.getCancellationPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.cancellation.findById')
  async getCancellationPolicyById(@Payload() data: { id: number }) {
    const policy = await this.policyService.getCancellationPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.getDefault')
  async getDefaultCancellationPolicy(@Payload() data: { clubId?: number }) {
    const policy = await this.policyService.getDefaultCancellationPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.resolve')
  async resolveCancellationPolicy(@Payload() data: PolicyResolveDto) {
    const policy = await this.policyService.resolveCancellationPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.create')
  async createCancellationPolicy(@Payload() data: CreateCancellationPolicyDto) {
    const policy = await this.policyService.createCancellationPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.update')
  async updateCancellationPolicy(
    @Payload() data: { id: number; dto: UpdateCancellationPolicyDto },
  ) {
    const policy = await this.policyService.updateCancellationPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.cancellation.delete')
  async deleteCancellationPolicy(@Payload() data: { id: number }) {
    const result = await this.policyService.deleteCancellationPolicy(data.id);
    return NatsResponse.success(result);
  }

  // =====================================================
  // Refund Policy Endpoints
  // =====================================================

  @MessagePattern('policy.refund.list')
  async listRefundPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    const policies = await this.policyService.getRefundPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.refund.findById')
  async getRefundPolicyById(@Payload() data: { id: number }) {
    const policy = await this.policyService.getRefundPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.getDefault')
  async getDefaultRefundPolicy(@Payload() data: { clubId?: number }) {
    const policy = await this.policyService.getDefaultRefundPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.resolve')
  async resolveRefundPolicy(@Payload() data: PolicyResolveDto) {
    const policy = await this.policyService.resolveRefundPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.create')
  async createRefundPolicy(@Payload() data: CreateRefundPolicyDto) {
    const policy = await this.policyService.createRefundPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.update')
  async updateRefundPolicy(@Payload() data: { id: number; dto: UpdateRefundPolicyDto }) {
    const policy = await this.policyService.updateRefundPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.refund.delete')
  async deleteRefundPolicy(@Payload() data: { id: number }) {
    const result = await this.policyService.deleteRefundPolicy(data.id);
    return NatsResponse.success(result);
  }

  @MessagePattern('policy.refund.calculate')
  async calculateRefund(
    @Payload() data: { policyId: number; originalAmount: number; hoursBeforeBooking: number },
  ) {
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
    const policies = await this.policyService.getNoShowPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.noshow.findById')
  async getNoShowPolicyById(@Payload() data: { id: number }) {
    const policy = await this.policyService.getNoShowPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.getDefault')
  async getDefaultNoShowPolicy(@Payload() data: { clubId?: number }) {
    const policy = await this.policyService.getDefaultNoShowPolicy(data.clubId);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.resolve')
  async resolveNoShowPolicy(@Payload() data: PolicyResolveDto) {
    const policy = await this.policyService.resolveNoShowPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.create')
  async createNoShowPolicy(@Payload() data: CreateNoShowPolicyDto) {
    const policy = await this.policyService.createNoShowPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.update')
  async updateNoShowPolicy(@Payload() data: { id: number; dto: UpdateNoShowPolicyDto }) {
    const policy = await this.policyService.updateNoShowPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.noshow.delete')
  async deleteNoShowPolicy(@Payload() data: { id: number }) {
    const result = await this.policyService.deleteNoShowPolicy(data.id);
    return NatsResponse.success(result);
  }

  @MessagePattern('policy.noshow.getUserCount')
  async getUserNoShowCount(
    @Payload() data: { userId: number; clubId?: number; companyId?: number },
  ) {
    const count = await this.policyService.getUserNoShowCount(
      data.userId, data.clubId, data.companyId,
    );
    return NatsResponse.success({ userId: data.userId, noShowCount: count });
  }

  @MessagePattern('policy.noshow.getApplicablePenalty')
  async getApplicablePenalty(
    @Payload() data: { userId: number; clubId?: number; companyId?: number },
  ) {
    const result = await this.policyService.getApplicablePenalty(
      data.userId, data.clubId, data.companyId,
    );
    return NatsResponse.success(result);
  }

  // =====================================================
  // Operating Policy Endpoints
  // =====================================================

  @MessagePattern('policy.operating.list')
  async listOperatingPolicies(@Payload() data: { filter?: PolicyFilterDto }) {
    const policies = await this.policyService.getOperatingPolicies(data.filter);
    return NatsResponse.success(policies);
  }

  @MessagePattern('policy.operating.findById')
  async getOperatingPolicyById(@Payload() data: { id: number }) {
    const policy = await this.policyService.getOperatingPolicyById(data.id);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.operating.resolve')
  async resolveOperatingPolicy(@Payload() data: PolicyResolveDto) {
    const policy = await this.policyService.resolveOperatingPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.operating.create')
  async createOperatingPolicy(@Payload() data: CreateOperatingPolicyDto) {
    const policy = await this.policyService.createOperatingPolicy(data);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.operating.update')
  async updateOperatingPolicy(
    @Payload() data: { id: number; dto: UpdateOperatingPolicyDto },
  ) {
    const policy = await this.policyService.updateOperatingPolicy(data.id, data.dto);
    return NatsResponse.success(policy);
  }

  @MessagePattern('policy.operating.delete')
  async deleteOperatingPolicy(@Payload() data: { id: number }) {
    const result = await this.policyService.deleteOperatingPolicy(data.id);
    return NatsResponse.success(result);
  }
}
