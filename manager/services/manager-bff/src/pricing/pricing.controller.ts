import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { QuoteDto, DiscountRuleDto } from './dto/pricing.dto';

@ApiTags('pricing')
@ApiBearerAuth()
@Controller('api/admin/pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('quote')
  @ApiOperation({ summary: '요금 견적(플레이어별 BASE+할인+부가)' })
  async quote(@Body() dto: QuoteDto) {
    return this.pricing.quote(dto);
  }

  @Get('discount-rules')
  @ApiOperation({ summary: '할인 규칙 목록' })
  async listDiscountRules(
    @Query('clubId') clubId?: string,
    @Query('companyId') companyId?: string,
    @Query('kind') kind?: string,
    @Query('active') active?: string,
  ) {
    return this.pricing.listDiscountRules({
      clubId: clubId ? Number(clubId) : undefined,
      companyId: companyId ? Number(companyId) : undefined,
      kind,
      active: active != null ? active === 'true' : undefined,
    });
  }

  @Post('discount-rules')
  @ApiOperation({ summary: '할인 규칙 생성/수정(upsert)' })
  async upsertDiscountRule(@Body() dto: DiscountRuleDto) {
    return this.pricing.upsertDiscountRule(dto);
  }

  @Delete('discount-rules/:id')
  @ApiOperation({ summary: '할인 규칙 삭제' })
  async deleteDiscountRule(@Param('id', ParseIntPipe) id: number) {
    return this.pricing.deleteDiscountRule(id);
  }
}
