import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';
import { NotificationTemplate, NotificationType } from '@prisma/client';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<NotificationTemplate> {
    this.logger.log(`Creating template for type: ${createTemplateDto.type}`);
    
    return this.prisma.notificationTemplate.create({
      data: createTemplateDto,
    });
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(type: NotificationType): Promise<NotificationTemplate | null> {
    return this.prisma.notificationTemplate.findFirst({
      where: {
        type,
        isActive: true,
      },
    });
  }

  async findOne(id: number): Promise<NotificationTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: number, updateTemplateDto: UpdateTemplateDto): Promise<NotificationTemplate> {
    await this.findOne(id); // Check if exists

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: updateTemplateDto,
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Check if exists

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  async processTemplate(template: NotificationTemplate, variables: Record<string, any>): Promise<{
    title: string;
    content: string;
  }> {
    let processedTitle = template.title;
    let processedContent = template.content;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedTitle = processedTitle.replace(new RegExp(placeholder, 'g'), String(value));
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return {
      title: processedTitle,
      content: processedContent,
    };
  }

  async generateNotificationFromTemplate(
    type: NotificationType,
    variables: Record<string, any>
  ): Promise<{ title: string; message: string } | null> {
    const template = await this.findByType(type);
    
    if (!template) {
      this.logger.warn(`No active template found for type: ${type}`);
      return null;
    }

    const processed = await this.processTemplate(template, variables);
    
    return {
      title: processed.title,
      message: processed.content,
    };
  }
}