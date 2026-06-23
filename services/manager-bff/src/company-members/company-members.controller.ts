import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CompanyMembersService } from './company-members.service';
import { AdminContext, AdminContextData, BearerToken } from '../common';

@ApiTags('company-members')
@ApiBearerAuth()
@Controller('api/admin/company-members')
export class CompanyMembersController {
  private readonly logger = new Logger(CompanyMembersController.name);

  constructor(private readonly companyMembersService: CompanyMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Get company members list' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Company members retrieved successfully' })
  async list(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = ctx?.companyId;
    this.logger.log(`List company members: companyId=${companyId}`);

    const query: any = { companyId };
    if (search) query.search = search;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (page) query.page = parseInt(page, 10);
    if (limit) query.limit = parseInt(limit, 10);

    return this.companyMembersService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create company member' })
  @ApiResponse({ status: 201, description: 'Company member created successfully' })
  async create(
    @AdminContext() ctx: AdminContextData | null,
    @BearerToken() _token: string,
    @Body() body: { userId: number; source?: string; memo?: string },
  ) {
    const companyId = ctx?.companyId;
    this.logger.log(`Create company member: companyId=${companyId}, userId=${body.userId}`);

    return this.companyMembersService.create({
      companyId,
      ...body,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company member' })
  @ApiResponse({ status: 200, description: 'Company member updated successfully' })
  async update(
    @BearerToken() _token: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { memo?: string; isActive?: boolean },
  ) {
    this.logger.log(`Update company member: ${id}`);
    return this.companyMembersService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company member' })
  @ApiResponse({ status: 200, description: 'Company member deleted successfully' })
  async remove(
    @BearerToken() _token: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.logger.log(`Delete company member: ${id}`);
    return this.companyMembersService.remove(id);
  }
}
