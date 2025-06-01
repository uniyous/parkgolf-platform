import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalRpcExceptionFilter } from './exception/rpc-exception.filter';
import { HealthController } from './controller/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RcpClient } from './microservice/rcp-client';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TerminusModule,
    ClientsModule.registerAsync([
      {
        name: RcpClient.USER_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_URLS')?.split(','),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: RcpClient.COURSE_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_URLS')?.split(','),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: RcpClient.NOTIFICATION_SERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: configService.get<string>('NATS_URLS')?.split(','),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalRpcExceptionFilter,
    },
  ],
  controllers: [HealthController],
  exports: [ConfigModule, ClientsModule],
})
export class CommonModule {}
