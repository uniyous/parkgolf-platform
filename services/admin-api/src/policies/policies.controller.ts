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
  HttpStatus,
  HttpException,
  Logger,
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
  private readonly logger = new Logger(PoliciesController.name);

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
    try {
      const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
      return await this.policiesService.getCancellationPolicies(filter);
    } catch (error) {
      this.logger.error('Failed to fetch cancellation policies', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.getDefaultCancellationPolicy(
        clubId ? parseInt(clubId) : undefined,
      );
    } catch (error) {
      this.logger.error('Failed to fetch default cancellation policy', error);
      throw this.handleError(error);
    }
  }

  @Get('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '취소 정책 조회 성공' })
  async getCancellationPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.getCancellationPolicyById(id);
    } catch (error) {
      this.logger.error(`Failed to fetch cancellation policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Post('cancellation')
  @ApiOperation({ summary: '취소 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '취소 정책 생성 성공' })
  async createCancellationPolicy(
    @Body() dto: CreateCancellationPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.createCancellationPolicy(dto);
    } catch (error) {
      this.logger.error('Failed to create cancellation policy', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.updateCancellationPolicy(id, dto);
    } catch (error) {
      this.logger.error(`Failed to update cancellation policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Delete('cancellation/:id')
  @ApiOperation({ summary: '취소 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '취소 정책 삭제 성공' })
  async deleteCancellationPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.deleteCancellationPolicy(id);
    } catch (error) {
      this.logger.error(`Failed to delete cancellation policy: ${id}`, error);
      throw this.handleError(error);
    }
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
    try {
      const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
      return await this.policiesService.getRefundPolicies(filter);
    } catch (error) {
      this.logger.error('Failed to fetch refund policies', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.getDefaultRefundPolicy(
        clubId ? parseInt(clubId) : undefined,
      );
    } catch (error) {
      this.logger.error('Failed to fetch default refund policy', error);
      throw this.handleError(error);
    }
  }

  @Get('refund/:id')
  @ApiOperation({ summary: '환불 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 정책 조회 성공' })
  async getRefundPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.getRefundPolicyById(id);
    } catch (error) {
      this.logger.error(`Failed to fetch refund policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Post('refund')
  @ApiOperation({ summary: '환불 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '환불 정책 생성 성공' })
  async createRefundPolicy(
    @Body() dto: CreateRefundPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.createRefundPolicy(dto);
    } catch (error) {
      this.logger.error('Failed to create refund policy', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.updateRefundPolicy(id, dto);
    } catch (error) {
      this.logger.error(`Failed to update refund policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Delete('refund/:id')
  @ApiOperation({ summary: '환불 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 정책 삭제 성공' })
  async deleteRefundPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.deleteRefundPolicy(id);
    } catch (error) {
      this.logger.error(`Failed to delete refund policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Post('refund/calculate')
  @ApiOperation({ summary: '환불 금액 계산' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '환불 금액 계산 성공' })
  async calculateRefund(
    @Body() body: { policyId: number; originalAmount: number; hoursBeforeBooking: number },
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.calculateRefund(
        body.policyId,
        body.originalAmount,
        body.hoursBeforeBooking,
      );
    } catch (error) {
      this.logger.error('Failed to calculate refund', error);
      throw this.handleError(error);
    }
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
    try {
      const filter = clubId ? { clubId: parseInt(clubId) } : undefined;
      return await this.policiesService.getNoShowPolicies(filter);
    } catch (error) {
      this.logger.error('Failed to fetch no-show policies', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.getDefaultNoShowPolicy(
        clubId ? parseInt(clubId) : undefined,
      );
    } catch (error) {
      this.logger.error('Failed to fetch default no-show policy', error);
      throw this.handleError(error);
    }
  }

  @Get('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 상세 조회' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '노쇼 정책 조회 성공' })
  async getNoShowPolicyById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.getNoShowPolicyById(id);
    } catch (error) {
      this.logger.error(`Failed to fetch no-show policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Post('noshow')
  @ApiOperation({ summary: '노쇼 정책 생성' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 201, description: '노쇼 정책 생성 성공' })
  async createNoShowPolicy(
    @Body() dto: CreateNoShowPolicyDto,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.createNoShowPolicy(dto);
    } catch (error) {
      this.logger.error('Failed to create no-show policy', error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.updateNoShowPolicy(id, dto);
    } catch (error) {
      this.logger.error(`Failed to update no-show policy: ${id}`, error);
      throw this.handleError(error);
    }
  }

  @Delete('noshow/:id')
  @ApiOperation({ summary: '노쇼 정책 삭제' })
  @ApiHeader({ name: 'authorization', description: 'Bearer token' })
  @ApiResponse({ status: 200, description: '노쇼 정책 삭제 성공' })
  async deleteNoShowPolicy(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') _authorization?: string,
  ) {
    try {
      return await this.policiesService.deleteNoShowPolicy(id);
    } catch (error) {
      this.logger.error(`Failed to delete no-show policy: ${id}`, error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.getUserNoShowCount(
        userId,
        clubId ? parseInt(clubId) : undefined,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch user no-show count: ${userId}`, error);
      throw this.handleError(error);
    }
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
    try {
      return await this.policiesService.getApplicablePenalty(
        userId,
        clubId ? parseInt(clubId) : undefined,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch applicable penalty: ${userId}`, error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error.message?.includes('timeout') || error.code === 'ECONNREFUSED') {
      return new HttpException(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Policy service temporarily unavailable',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return new HttpException(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
