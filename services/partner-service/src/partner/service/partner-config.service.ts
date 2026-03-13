import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { CreatePartnerConfigDto } from '../dto/create-partner-config.dto';
import { UpdatePartnerConfigDto } from '../dto/update-partner-config.dto';
import { AppException, Errors } from '../../common/exceptions';

@Injectable()
export class PartnerConfigService {
  private readonly logger = new Logger(PartnerConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(dto: CreatePartnerConfigDto) {
    const config = await this.prisma.partnerConfig.create({
      data: {
        ...dto,
        responseMapping: dto.responseMapping as object,
        apiKey: this.cryptoService.encrypt(dto.apiKey),
        apiSecret: dto.apiSecret ? this.cryptoService.encrypt(dto.apiSecret) : undefined,
        webhookSecret: dto.webhookSecret ? this.cryptoService.encrypt(dto.webhookSecret) : undefined,
      },
    });

    return this.maskSensitiveFields(config);
  }

  async findById(id: number) {
    const config = await this.prisma.partnerConfig.findUnique({
      where: { id },
      include: { courseMappings: true },
    });

    if (!config) {
      throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    }

    return this.maskSensitiveFields(config);
  }

  async findByClubId(clubId: number) {
    const config = await this.prisma.partnerConfig.findUnique({
      where: { clubId },
      include: { courseMappings: true },
    });

    if (!config) {
      throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    }

    return this.maskSensitiveFields(config);
  }

  async findAll(params: { page?: number; limit?: number; companyId?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, companyId, isActive } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (companyId !== undefined) where.companyId = companyId;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.partnerConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { courseMappings: { select: { id: true, externalCourseName: true, internalGameId: true } } },
      }),
      this.prisma.partnerConfig.count({ where }),
    ]);

    return {
      data: items.map((item) => this.maskSensitiveFields(item)),
      total,
      page,
      limit,
    };
  }

  async update(dto: UpdatePartnerConfigDto) {
    const { id, ...updateData } = dto;

    // 암호화 필드 처리
    const data: Record<string, unknown> = { ...updateData };
    if (updateData.apiKey) {
      data.apiKey = this.cryptoService.encrypt(updateData.apiKey);
    }
    if (updateData.apiSecret) {
      data.apiSecret = this.cryptoService.encrypt(updateData.apiSecret);
    }
    if (updateData.webhookSecret) {
      data.webhookSecret = this.cryptoService.encrypt(updateData.webhookSecret);
    }
    if (updateData.responseMapping) {
      data.responseMapping = updateData.responseMapping as object;
    }

    const config = await this.prisma.partnerConfig.update({
      where: { id },
      data,
    });

    return this.maskSensitiveFields(config);
  }

  async delete(id: number) {
    await this.prisma.partnerConfig.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * 내부 호출용: 복호화된 설정 반환 (서비스 간 사용)
   */
  async findByIdWithDecryptedKeys(id: number) {
    const config = await this.prisma.partnerConfig.findUnique({
      where: { id },
      include: { courseMappings: true },
    });

    if (!config) {
      throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
    }

    return {
      ...config,
      apiKey: this.cryptoService.decrypt(config.apiKey),
      apiSecret: config.apiSecret ? this.cryptoService.decrypt(config.apiSecret) : null,
      webhookSecret: config.webhookSecret ? this.cryptoService.decrypt(config.webhookSecret) : null,
    };
  }

  /**
   * 활성 파트너 목록 (동기화용)
   */
  async findActiveForSync(syncType: 'slot' | 'booking') {
    const where: Record<string, unknown> = {
      isActive: true,
      syncMode: { in: ['API_POLLING', 'HYBRID'] },
    };

    if (syncType === 'slot') {
      where.slotSyncEnabled = true;
    } else {
      where.bookingSyncEnabled = true;
    }

    return this.prisma.partnerConfig.findMany({
      where,
      include: { courseMappings: { where: { isActive: true } } },
    });
  }

  /**
   * 민감 필드 마스킹 (외부 응답용)
   */
  private maskSensitiveFields(config: Record<string, unknown>) {
    return {
      ...config,
      apiKey: '********',
      apiSecret: config.apiSecret ? '********' : null,
      webhookSecret: config.webhookSecret ? '********' : null,
    };
  }
}
