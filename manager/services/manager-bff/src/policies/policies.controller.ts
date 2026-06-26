import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { BearerToken, AdminContext, AdminContextData } from '../common';
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

@ApiTags('policies')
@ApiBearerAuth()
@Controller('api/admin/policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  // =====================================================
  // Cancellation Policy Endpoints
  // =====================================================

  @Get('cancellation')
  @ApiOperation({ summary: '취소 정책 목록 조회' })
  @ApiResponse({ status: 200, description: '취소 정책 목록 조회 성공' })
  async getCancellationPolicies(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() filter: PolicyFilterDto,
  ) {
    if (ctx?.companyId && !filter.companyId) {
      filter.companyId = ctx.companyId;
    }
    return this.policiesService.getCancellationPolicies(filter);
  }

  @Get('cancellation/resolve')
  @ApiOperation({ summary: '취소 정책 조회 (3단계 폴백)' })
  @ApiResponse({ status: 200, description: '적용 취소 정책 조회 성공' })
  async resolveCancellationPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() query: PolicyResolveQueryDto,
  ) {
    if (ctx?.companyId && !query.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.policiesService.resolveCancellationPolicy(query);
  }

  @Get('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 상세 조회' })
  @ApiResponse({ status: 200, description: '취소 정책 조회 성공' })
  async getCancellationPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.getCancellationPolicyById(id);
  }

  @Post('cancellation')
  @ApiOperation({ summary: '취소 정책 생성' })
  @ApiResponse({ status: 201, description: '취소 정책 생성 성공' })
  async createCancellationPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Body() dto: CreateCancellationPolicyDto,
  ) {
    if (ctx?.companyId && !dto.companyId) {
      dto.companyId = ctx.companyId;
    }
    return this.policiesService.createCancellationPolicy(dto);
  }

  @Put('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 수정' })
  @ApiResponse({ status: 200, description: '취소 정책 수정 성공' })
  async updateCancellationPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
    @Body() dto: UpdateCancellationPolicyDto,
  ) {
    return this.policiesService.updateCancellationPolicy(id, dto);
  }

  @Delete('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 삭제' })
  @ApiResponse({ status: 200, description: '취소 정책 삭제 성공' })
  async deleteCancellationPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.deleteCancellationPolicy(id);
  }

  // =====================================================
  // Refund Policy Endpoints
  // =====================================================

  @Get('refund')
  @ApiOperation({ summary: '환불 정책 목록 조회' })
  @ApiResponse({ status: 200, description: '환불 정책 목록 조회 성공' })
  async getRefundPolicies(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() filter: PolicyFilterDto,
  ) {
    if (ctx?.companyId && !filter.companyId) {
      filter.companyId = ctx.companyId;
    }
    return this.policiesService.getRefundPolicies(filter);
  }

  @Get('refund/resolve')
  @ApiOperation({ summary: '환불 정책 조회 (3단계 폴백)' })
  @ApiResponse({ status: 200, description: '적용 환불 정책 조회 성공' })
  async resolveRefundPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() query: PolicyResolveQueryDto,
  ) {
    if (ctx?.companyId && !query.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.policiesService.resolveRefundPolicy(query);
  }

  @Get('refund/:id')
  @ApiOperation({ summary: '환불 정책 상세 조회' })
  @ApiResponse({ status: 200, description: '환불 정책 조회 성공' })
  async getRefundPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.getRefundPolicyById(id);
  }

  @Post('refund')
  @ApiOperation({ summary: '환불 정책 생성' })
  @ApiResponse({ status: 201, description: '환불 정책 생성 성공' })
  async createRefundPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Body() dto: CreateRefundPolicyDto,
  ) {
    if (ctx?.companyId && !dto.companyId) {
      dto.companyId = ctx.companyId;
    }
    return this.policiesService.createRefundPolicy(dto);
  }

  @Put('refund/:id')
  @ApiOperation({ summary: '환불 정책 수정' })
  @ApiResponse({ status: 200, description: '환불 정책 수정 성공' })
  async updateRefundPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
    @Body() dto: UpdateRefundPolicyDto,
  ) {
    return this.policiesService.updateRefundPolicy(id, dto);
  }

  @Delete('refund/:id')
  @ApiOperation({ summary: '환불 정책 삭제' })
  @ApiResponse({ status: 200, description: '환불 정책 삭제 성공' })
  async deleteRefundPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.deleteRefundPolicy(id);
  }

  @Post('refund/calculate')
  @ApiOperation({ summary: '환불 금액 계산' })
  @ApiResponse({ status: 200, description: '환불 금액 계산 성공' })
  async calculateRefund(
    @BearerToken() _token: string,
    @Body() body: { policyId: number; originalAmount: number; hoursBeforeBooking: number },
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
  @ApiResponse({ status: 200, description: '노쇼 정책 목록 조회 성공' })
  async getNoShowPolicies(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() filter: PolicyFilterDto,
  ) {
    if (ctx?.companyId && !filter.companyId) {
      filter.companyId = ctx.companyId;
    }
    return this.policiesService.getNoShowPolicies(filter);
  }

  @Get('noshow/resolve')
  @ApiOperation({ summary: '노쇼 정책 조회 (3단계 폴백)' })
  @ApiResponse({ status: 200, description: '적용 노쇼 정책 조회 성공' })
  async resolveNoShowPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() query: PolicyResolveQueryDto,
  ) {
    if (ctx?.companyId && !query.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.policiesService.resolveNoShowPolicy(query);
  }

  @Get('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 상세 조회' })
  @ApiResponse({ status: 200, description: '노쇼 정책 조회 성공' })
  async getNoShowPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.getNoShowPolicyById(id);
  }

  @Post('noshow')
  @ApiOperation({ summary: '노쇼 정책 생성' })
  @ApiResponse({ status: 201, description: '노쇼 정책 생성 성공' })
  async createNoShowPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Body() dto: CreateNoShowPolicyDto,
  ) {
    if (ctx?.companyId && !dto.companyId) {
      dto.companyId = ctx.companyId;
    }
    return this.policiesService.createNoShowPolicy(dto);
  }

  @Put('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 수정' })
  @ApiResponse({ status: 200, description: '노쇼 정책 수정 성공' })
  async updateNoShowPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
    @Body() dto: UpdateNoShowPolicyDto,
  ) {
    return this.policiesService.updateNoShowPolicy(id, dto);
  }

  @Delete('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 삭제' })
  @ApiResponse({ status: 200, description: '노쇼 정책 삭제 성공' })
  async deleteNoShowPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.deleteNoShowPolicy(id);
  }

  @Get('noshow/user/:userId/count')
  @ApiOperation({ summary: '사용자 노쇼 횟수 조회' })
  @ApiQuery({ name: 'clubId', required: false })
  @ApiResponse({ status: 200, description: '노쇼 횟수 조회 성공' })
  async getUserNoShowCount(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('clubId') clubId?: string,
  ) {
    return this.policiesService.getUserNoShowCount(
      userId,
      clubId ? parseInt(clubId) : undefined,
      ctx?.companyId ?? undefined,
    );
  }

  @Get('noshow/user/:userId/penalty')
  @ApiOperation({ summary: '사용자에게 적용될 페널티 조회' })
  @ApiQuery({ name: 'clubId', required: false })
  @ApiResponse({ status: 200, description: '페널티 조회 성공' })
  async getApplicablePenalty(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('clubId') clubId?: string,
  ) {
    return this.policiesService.getApplicablePenalty(
      userId,
      clubId ? parseInt(clubId) : undefined,
      ctx?.companyId ?? undefined,
    );
  }

  // =====================================================
  // Operating Policy Endpoints
  // =====================================================

  @Get('operating')
  @ApiOperation({ summary: '운영 정책 목록 조회' })
  @ApiResponse({ status: 200, description: '운영 정책 목록 조회 성공' })
  async getOperatingPolicies(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() filter: PolicyFilterDto,
  ) {
    if (ctx?.companyId && !filter.companyId) {
      filter.companyId = ctx.companyId;
    }
    return this.policiesService.getOperatingPolicies(filter);
  }

  @Get('operating/resolve')
  @ApiOperation({ summary: '운영 정책 조회 (3단계 폴백)' })
  @ApiResponse({ status: 200, description: '적용 운영 정책 조회 성공' })
  async resolveOperatingPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query() query: PolicyResolveQueryDto,
  ) {
    if (ctx?.companyId && !query.companyId) {
      query.companyId = ctx.companyId;
    }
    return this.policiesService.resolveOperatingPolicy(query);
  }

  @Get('operating/:id')
  @ApiOperation({ summary: '운영 정책 상세 조회' })
  @ApiResponse({ status: 200, description: '운영 정책 조회 성공' })
  async getOperatingPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.getOperatingPolicyById(id);
  }

  @Post('operating')
  @ApiOperation({ summary: '운영 정책 생성' })
  @ApiResponse({ status: 201, description: '운영 정책 생성 성공' })
  async createOperatingPolicy(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Body() dto: CreateOperatingPolicyDto,
  ) {
    if (ctx?.companyId && !dto.companyId) {
      dto.companyId = ctx.companyId;
    }
    return this.policiesService.createOperatingPolicy(dto);
  }

  @Put('operating/:id')
  @ApiOperation({ summary: '운영 정책 수정' })
  @ApiResponse({ status: 200, description: '운영 정책 수정 성공' })
  async updateOperatingPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
    @Body() dto: UpdateOperatingPolicyDto,
  ) {
    return this.policiesService.updateOperatingPolicy(id, dto);
  }

  @Delete('operating/:id')
  @ApiOperation({ summary: '운영 정책 삭제' })
  @ApiResponse({ status: 200, description: '운영 정책 삭제 성공' })
  async deleteOperatingPolicy(
    @Param('id', ParseIntPipe) id: number,
    @BearerToken() _token: string,
  ) {
    return this.policiesService.deleteOperatingPolicy(id);
  }
}
