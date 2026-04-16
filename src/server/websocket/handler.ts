import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface RegisterPayload {
  screenId: string;
}

interface StatusPayload {
  screenId: string;
  currentMediaId: string;
  progress: number;
  isPlaying: boolean;
}

const screenSockets = new Map<string, Socket>();

export function setupWebSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const lanPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/;
        callback(null, lanPattern.test(origin));
      },
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('register', async (payload: RegisterPayload) => {
      const { screenId } = payload;
      if (!screenId) {
        socket.disconnect(true);
        return;
      }

      const screen = await prisma.screen.findFirst({
        where: {
          id: screenId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!screen) {
        console.warn(`[Socket] Reject register for deleted/missing screen ${screenId}`);
        socket.emit('registration_failed', { message: 'Screen not found' });
        socket.disconnect(true);
        return;
      }

      console.log(`[Socket] Screen ${screenId} registered`);

      screenSockets.set(screenId, socket);
      socket.join(`screen:${screenId}`);

      // Update screen status
      await prisma.screen.update({
        where: { id: screenId },
        data: { status: 'online', lastPing: new Date() },
      }).catch(() => {});
    });

    socket.on('status', async (payload: StatusPayload) => {
      const { screenId } = payload;
      if (!screenId) {
        return;
      }

      const result = await prisma.screen.updateMany({
        where: {
          id: screenId,
          deletedAt: null,
        },
        data: { lastPing: new Date() },
      });

      if (result.count === 0) {
        console.warn(`[Socket] Disconnect missing/deleted screen ${screenId}`);
        screenSockets.delete(screenId);
        socket.disconnect(true);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Find and update disconnected screen
      for (const [screenId, s] of screenSockets) {
        if (s.id === socket.id) {
          screenSockets.delete(screenId);
          await prisma.screen.updateMany({
            where: { id: screenId, deletedAt: null },
            data: { status: 'offline' },
          }).catch(() => {});
          break;
        }
      }
    });
  });

  // Heartbeat ping every 30s
  setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
  }, 30000);

  return io;
}

export function notifyPlaylistUpdate(io: Server, screenId: string, playlist: unknown[]) {
  io.to(`screen:${screenId}`).emit('playlist_updated', {
    screenId,
    playlist,
  });
}
