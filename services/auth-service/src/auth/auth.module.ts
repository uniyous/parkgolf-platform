import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthNatsController } from './auth-nats.controller';
import { UserModule } from '../user/user.module';
import { AdminModule } from '../admin/admin.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        UserModule,
        AdminModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
                },
            }),
            inject: [ConfigService],
        }),
        ConfigModule,
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthNatsController],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}