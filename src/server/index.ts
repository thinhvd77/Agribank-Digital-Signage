import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { setupWebSocket } from './websocket/handler';

// Serialize BigInt as Number in JSON responses (Prisma returns BigInt for file_size)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = createServer(app);
const io = setupWebSocket(server);

// Make io available to routes
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready`);
});
