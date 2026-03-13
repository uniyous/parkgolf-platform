import { Module, Global } from '@nestjs/common';
import { PartnerClientService } from './partner-client.service';
import { PartnerResilienceService } from './partner-resilience.service';
import { CryptoService } from '../partner/service/crypto.service';

@Global()
@Module({
  providers: [PartnerClientService, PartnerResilienceService, CryptoService],
  exports: [PartnerClientService, PartnerResilienceService, CryptoService],
})
export class ClientModule {}
