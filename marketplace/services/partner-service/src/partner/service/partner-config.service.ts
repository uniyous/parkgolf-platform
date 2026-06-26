import { Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { partnerConfigs, gameMappings } from '../../db/schema';
import { CryptoService } from './crypto.service';
import { CreatePartnerConfigDto } from '../dto/create-partner-config.dto';
import { UpdatePartnerConfigDto } from '../dto/update-partner-config.dto';
import { AppException, Errors } from '../../common/exceptions';

@Injectable()
export class PartnerConfigService {
  private readonly logger = new Logger(PartnerConfigService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cryptoService: CryptoService,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(dto: CreatePartnerConfigDto) {
    const [config] = await this.db
      .insert(partnerConfigs)
      .values({
        ...dto,
        responseMapping: dto.responseMapping as object,
        apiKey: this.cryptoService.encrypt(dto.apiKey),
        apiSecret: dto.apiSecret ? this.cryptoService.encrypt(dto.apiSecret) : undefined,
        webhookSecret: dto.webhookSecret ? this.cryptoService.encrypt(dto.webhookSecret) : undefined,
      })
      .returning();
    return this.maskSensitiveFields(config);
  }

  async findById(id: number) {
    const config = await this.db.query.partnerConfigs.findFirst({ where: eq(partnerConfigs.id, id), with: { gameMappings: true } });
    if (!config) throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    return this.maskSensitiveFields(config);
  }

  async isPartnerClub(clubId: number): Promise<boolean> {
    const [config] = await this.db.select({ isActive: partnerConfigs.isActive }).from(partnerConfigs).where(eq(partnerConfigs.clubId, clubId)).limit(1);
    return !!config?.isActive;
  }

  async findByClubId(clubId: number) {
    const config = await this.db.query.partnerConfigs.findFirst({ where: eq(partnerConfigs.clubId, clubId), with: { gameMappings: true } });
    if (!config) throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    return this.maskSensitiveFields(config);
  }

  async findAll(params: { page?: number; limit?: number; companyId?: number; isActive?: boolean }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const conds = [];
    if (params.companyId !== undefined) conds.push(eq(partnerConfigs.companyId, Number(params.companyId)));
    if (params.isActive !== undefined) conds.push(eq(partnerConfigs.isActive, params.isActive === true || (params.isActive as unknown) === 'true'));
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      this.db.query.partnerConfigs.findMany({
        where,
        orderBy: desc(partnerConfigs.createdAt),
        limit,
        offset: (page - 1) * limit,
        with: { gameMappings: { columns: { id: true, externalCourseName: true, internalGameId: true } } },
      }),
      this.db.select({ value: count() }).from(partnerConfigs).where(where),
    ]);

    return { data: items.map((item) => this.maskSensitiveFields(item)), total: totalRows[0].value, page, limit };
  }

  async update(dto: UpdatePartnerConfigDto) {
    const { id, ...updateData } = dto;

    const data: Partial<typeof partnerConfigs.$inferInsert> = { ...updateData };
    if (updateData.apiKey) data.apiKey = this.cryptoService.encrypt(updateData.apiKey);
    if (updateData.apiSecret) data.apiSecret = this.cryptoService.encrypt(updateData.apiSecret);
    if (updateData.webhookSecret) data.webhookSecret = this.cryptoService.encrypt(updateData.webhookSecret);
    if (updateData.responseMapping) data.responseMapping = updateData.responseMapping as object;

    const [config] = await this.db.update(partnerConfigs).set(data).where(eq(partnerConfigs.id, id)).returning();
    return this.maskSensitiveFields(config);
  }

  async delete(id: number) {
    await this.db.delete(partnerConfigs).where(eq(partnerConfigs.id, id));
    return { deleted: true };
  }

  async findByIdWithDecryptedKeys(id: number) {
    const config = await this.db.query.partnerConfigs.findFirst({ where: eq(partnerConfigs.id, id), with: { gameMappings: true } });
    if (!config) throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    return {
      ...config,
      apiKey: this.cryptoService.decrypt(config.apiKey),
      apiSecret: config.apiSecret ? this.cryptoService.decrypt(config.apiSecret) : null,
      webhookSecret: config.webhookSecret ? this.cryptoService.decrypt(config.webhookSecret) : null,
    };
  }

  async findActiveForSync(syncType: 'slot' | 'booking') {
    const conds = [eq(partnerConfigs.isActive, true), inArray(partnerConfigs.syncMode, ['API_POLLING', 'HYBRID'])];
    conds.push(syncType === 'slot' ? eq(partnerConfigs.slotSyncEnabled, true) : eq(partnerConfigs.bookingSyncEnabled, true));
    return this.db.query.partnerConfigs.findMany({
      where: and(...conds),
      with: { gameMappings: { where: eq(gameMappings.isActive, true) } },
    });
  }

  private maskSensitiveFields(config: Record<string, unknown>) {
    return {
      ...config,
      apiKey: '********',
      apiSecret: config.apiSecret ? '********' : null,
      webhookSecret: config.webhookSecret ? '********' : null,
    };
  }
}
