import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { setupWebSocket } from './websocket/handler';

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = createServer(app);
const io = setupWebSocket(server);

// Make io available to routes
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready`);
});
