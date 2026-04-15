import { createServer } from 'http';
import app from './app';

const PORT = process.env.PORT || 3001;

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
