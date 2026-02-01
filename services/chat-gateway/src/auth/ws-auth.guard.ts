import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

export interface WsUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthenticatedSocket extends Socket {
  user: WsUser;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
      };
      return true;
    } catch (error) {
      this.logger.warn(`Invalid token: ${error}`);
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractToken(client: Socket): string | null {
    // 1. Preferred: auth object (Socket.IO auth)
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    // 2. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3. Deprecated: query param (token exposed in URL/logs)
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      this.logger.warn(
        `[DEPRECATION] Client ${client.id} using query param for token. ` +
        'Migrate to auth object or Authorization header.',
      );
      return token;
    }

    return null;
  }
}
