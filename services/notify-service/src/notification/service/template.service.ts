import { Injectable, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { notificationTemplates, type NotificationTemplate } from '../../db/schema';
import { NotificationType } from '../../contracts/enums';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    this.logger.log(`Creating template for type: ${dto.type}`);
    const [row] = await this.db.insert(notificationTemplates).values(dto).returning();
    return row;
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.db.select().from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt));
  }

  async findByType(type: NotificationType): Promise<NotificationTemplate | null> {
    const [row] = await this.db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.type, type), eq(notificationTemplates.isActive, true)))
      .limit(1);
    return row ?? null;
  }

  async findOne(id: number): Promise<NotificationTemplate> {
    const [template] = await this.db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id)).limit(1);
    if (!template) throw new AppException(Errors.Notification.TEMPLATE_NOT_FOUND);
    return template;
  }

  async update(id: number, dto: UpdateTemplateDto): Promise<NotificationTemplate> {
    await this.findOne(id);
    const [row] = await this.db.update(notificationTemplates).set(dto).where(eq(notificationTemplates.id, id)).returning();
    return row;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  }

  async processTemplate(template: NotificationTemplate, variables: Record<string, unknown>): Promise<{ title: string; content: string }> {
    let processedTitle = template.title;
    let processedContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedTitle = processedTitle.replace(new RegExp(placeholder, 'g'), String(value));
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return { title: processedTitle, content: processedContent };
  }

  async generateNotificationFromTemplate(type: NotificationType, variables: Record<string, unknown>): Promise<{ title: string; message: string } | null> {
    const template = await this.findByType(type);
    if (!template) {
      this.logger.warn(`No active template found for type: ${type}`);
      return null;
    }
    const processed = await this.processTemplate(template, variables);
    return { title: processed.title, message: processed.content };
  }
}
