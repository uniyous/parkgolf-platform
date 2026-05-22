import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const REQUEST_TIMEOUT = 10000;

@Injectable()
export class SocialTools {
  private readonly logger = new Logger(SocialTools.name);

  constructor(@Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy) {}

  async getChatRoomMembers(roomId: string): Promise<Array<{
    userId: number;
    userName: string;
    userEmail: string;
  }> | null> {
    try {
      const response = await firstValueFrom(
        this.chatClient.send('chat.room.getMembers', { roomId }).pipe(
          timeout(REQUEST_TIMEOUT),
          catchError(() => [null]),
        ),
      );

      if (response?.success && Array.isArray(response.data)) {
        return response.data.map((m: any) => ({
          userId: m.userId,
          userName: m.userName,
          userEmail: m.userEmail || '',
        }));
      }
      return null;
    } catch {
      return null;
    }
  }
}
