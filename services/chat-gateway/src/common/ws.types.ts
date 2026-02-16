import { Socket } from 'socket.io';

export interface WsUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthenticatedSocket extends Socket {
  user: WsUser;
}
