import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedSocket, WsUser } from './ws.types';

/**
 * Socket.IO 클라이언트에서 JWT 토큰 추출
 * 우선순위: auth object → Authorization header → query param (deprecated)
 */
export function extractToken(client: AuthenticatedSocket): string | null {
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
    return token;
  }

  return null;
}

/**
 * WebSocket 연결 시 JWT 인증 처리
 * 성공 시 WsUser 반환, 실패 시 소켓 disconnect 후 null 반환
 */
export async function authenticateSocket(
  client: AuthenticatedSocket,
  jwtService: JwtService,
  logger: Logger,
): Promise<WsUser | null> {
  const token = extractToken(client);
  if (!token) {
    logger.warn(`Connection rejected: No token - ${client.id}`);
    client.emit('error', { message: 'Unauthorized' });
    client.disconnect();
    return null;
  }

  try {
    const payload = await jwtService.verifyAsync(token);
    const user: WsUser = {
      id: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
    };
    client.user = user;
    client.data = {
      ...client.data,
      userId: user.id,
      userName: user.name,
      tokenExp: payload.exp,
    };
    return user;
  } catch (error) {
    logger.warn(`Connection failed: ${error} - ${client.id}`);
    client.emit('error', { message: 'Authentication failed' });
    client.disconnect();
    return null;
  }
}
