import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type SenderType = 'human' | 'agent' | 'npc';

export interface ChatMessage {
  id: number;
  room: string;
  sender_name: string;
  sender_type: SenderType;
  class: string;
  icon: string;
  message: string;
  event_type?: string;
  timestamp: string;
}

export interface PresenceEvent {
  type: 'join' | 'leave';
  sender_name: string;
  sender_type: SenderType;
  room: string;
  timestamp: string;
}

export interface DungeonEvent extends ChatMessage {
  event_type: string;
}

class TavernSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect() {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[socket] connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts++;
      console.warn(`[socket] connect error (${this.reconnectAttempts}):`, err.message);
    });

    return this.socket;
  }

  get instance(): Socket | null {
    return this.socket;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinRoom(room: string, profile: { sender_name: string; sender_type: SenderType; class: string }) {
    this.socket?.emit('join_room', { room, ...profile });
  }

  leaveRoom(room: string) {
    this.socket?.emit('leave_room', { room });
  }

  sendMessage(room: string, message: string) {
    this.socket?.emit('message', { room, message });
  }

  onMessage(handler: (msg: ChatMessage) => void) {
    this.socket?.on('message', handler);
    return () => this.socket?.off('message', handler);
  }

  onHistory(handler: (msgs: ChatMessage[]) => void) {
    this.socket?.on('history', handler);
    return () => this.socket?.off('history', handler);
  }

  onPresence(handler: (event: PresenceEvent) => void) {
    this.socket?.on('presence', handler);
    return () => this.socket?.off('presence', handler);
  }

  onDungeonEvent(handler: (event: DungeonEvent) => void) {
    this.socket?.on('dungeon_event', handler);
    return () => this.socket?.off('dungeon_event', handler);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

// Singleton
const tavernSocket = new TavernSocket();
export default tavernSocket;
