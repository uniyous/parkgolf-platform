import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import {
  CreateCancellationPolicyDto,
  UpdateCancellationPolicyDto,
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
  CreateNoShowPolicyDto,
  UpdateNoShowPolicyDto,
} from './dto/policy.dto';

@ApiTags('policies')
@Controller('api/admin/policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  // =====================================================
  // Cancellation Policy Endpoints
  // =====================================================

  @Get('cancellation')
  @ApiOperation({ summary: '취소 정책 목록 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID 필터' })
  @ApiResponse({ status: 200, description: '취소 정책 목록 조회 성공' })
  async getCancellationPolicies(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
    return this.policiesService.getCancellationPolicies(filter);
  }

  @Get('cancellation/default')
  @ApiOperation({ summary: '기본 취소 정책 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID' })
  @ApiResponse({ status: 200, description: '기본 취소 정책 조회 성공' })
  async getDefaultCancellationPolicy(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getDefaultCancellationPolicy(
      clubId ? parseInt(clubId) : undefined,
    );
  }

  @Get('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '취소 정책 조회 성공' })
  async getCancellationPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getCancellationPolicyById(id);
  }

  @Post('cancellation')
  @ApiOperation({ summary: '취소 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '취소 정책 생성 성공' })
  async createCancellationPolicy(
    @Body() dto: CreateCancellationPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.createCancellationPolicy(dto);
  }

  @Put('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 수정' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '취소 정책 수정 성공' })
  async updateCancellationPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCancellationPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.updateCancellationPolicy(id, dto);
  }

  @Delete('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '취소 정책 삭제 성공' })
  async deleteCancellationPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.deleteCancellationPolicy(id);
  }

  // =====================================================
  // Refund Policy Endpoints
  // =====================================================

  @Get('refund')
  @ApiOperation({ summary: '환불 정책 목록 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID 필터' })
  @ApiResponse({ status: 200, description: '환불 정책 목록 조회 성공' })
  async getRefundPolicies(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
    return this.policiesService.getRefundPolicies(filter);
  }

  @Get('refund/default')
  @ApiOperation({ summary: '기본 환불 정책 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID' })
  @ApiResponse({ status: 200, description: '기본 환불 정책 조회 성공' })
  async getDefaultRefundPolicy(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getDefaultRefundPolicy(
      clubId ? parseInt(clubId) : undefined,
    );
  }

  @Get('refund/:id')
  @ApiOperation({ summary: '환불 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 정책 조회 성공' })
  async getRefundPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getRefundPolicyById(id);
  }

  @Post('refund')
  @ApiOperation({ summary: '환불 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '환불 정책 생성 성공' })
  async createRefundPolicy(
    @Body() dto: CreateRefundPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.createRefundPolicy(dto);
  }

  @Put('refund/:id')
  @ApiOperation({ summary: '환불 정책 수정' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 정책 수정 성공' })
  async updateRefundPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRefundPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.updateRefundPolicy(id, dto);
  }

  @Delete('refund/:id')
  @ApiOperation({ summary: '환불 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 정책 삭제 성공' })
  async deleteRefundPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.deleteRefundPolicy(id);
  }

  @Post('refund/calculate')
  @ApiOperation({ summary: '환불 금액 계산' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 금액 계산 성공' })
  async calculateRefund(
    @Body() body: { policyId: number; originalAmount: number; hoursBeforeBooking: number },
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.calculateRefund(
      body.policyId,
      body.originalAmount,
      body.hoursBeforeBooking,
    );
  }

  // =====================================================
  // No-Show Policy Endpoints
  // =====================================================

  @Get('noshow')
  @ApiOperation({ summary: '노쇼 정책 목록 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID 필터' })
  @ApiResponse({ status: 200, description: '노쇼 정책 목록 조회 성공' })
  async getNoShowPolicies(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
    return this.policiesService.getNoShowPolicies(filter);
  }

  @Get('noshow/default')
  @ApiOperation({ summary: '기본 노쇼 정책 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID' })
  @ApiResponse({ status: 200, description: '기본 노쇼 정책 조회 성공' })
  async getDefaultNoShowPolicy(
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getDefaultNoShowPolicy(
      clubId ? parseInt(clubId) : undefined,
    );
  }

  @Get('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '노쇼 정책 조회 성공' })
  async getNoShowPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getNoShowPolicyById(id);
  }

  @Post('noshow')
  @ApiOperation({ summary: '노쇼 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '노쇼 정책 생성 성공' })
  async createNoShowPolicy(
    @Body() dto: CreateNoShowPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.createNoShowPolicy(dto);
  }

  @Put('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 수정' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '노쇼 정책 수정 성공' })
  async updateNoShowPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoShowPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.updateNoShowPolicy(id, dto);
  }

  @Delete('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '노쇼 정책 삭제 성공' })
  async deleteNoShowPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.deleteNoShowPolicy(id);
  }

  @Get('noshow/user/:userId/count')
  @ApiOperation({ summary: '사용자 노쇼 횟수 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID' })
  @ApiResponse({ status: 200, description: '노쇼 횟수 조회 성공' })
  async getUserNoShowCount(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getUserNoShowCount(
      userId,
      clubId ? parseInt(clubId) : undefined,
    );
  }

  @Get('noshow/user/:userId/penalty')
  @ApiOperation({ summary: '사용자에게 적용될 페널티 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiQuery({ name: 'clubId', required: false, description: '골프장 ID' })
  @ApiResponse({ status: 200, description: '페널티 조회 성공' })
  async getApplicablePenalty(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('clubId') clubId?: string,
    @Headers('authorization') _authorization?: string,
  ) {
    return this.policiesService.getApplicablePenalty(
      userId,
      clubId ? parseInt(clubId) : undefined,
    );
  }
}
