import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TemplateService } from '../service/template.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';

@ApiTags('notification-templates')
@Controller('api/notifications/templates')
export class TemplateController {
  private readonly logger = new Logger(TemplateController.name);

  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: '알림 템플릿 생성' })
  @ApiResponse({ status: 201, description: '템플릿이 성공적으로 생성됨' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: '모든 알림 템플릿 조회' })
  @ApiResponse({ status: 200, description: '템플릿 목록 반환' })
  async findAll() {
    return this.templateService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 알림 템플릿 조회' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  @ApiResponse({ status: 200, description: '템플릿 정보 반환' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '알림 템플릿 수정' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  @ApiResponse({ status: 200, description: '템플릿이 성공적으로 수정됨' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 템플릿 삭제' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  @ApiResponse({ status: 200, description: '템플릿이 성공적으로 삭제됨' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.templateService.remove(id);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/test')
  @ApiOperation({ summary: '템플릿 테스트 (변수 치환 확인)' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  async testTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() variables: Record<string, any>,
  ) {
    const template = await this.templateService.findOne(id);
    const processed = await this.templateService.processTemplate(template, variables);
    
    return {
      template: {
        id: template.id,
        type: template.type,
        originalTitle: template.title,
        originalContent: template.content,
      },
      variables,
      result: processed,
    };
  }
}