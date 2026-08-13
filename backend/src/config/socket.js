const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Called once from server.js with the raw http server.
function initSocket(httpServer) {
  const allowedOrigins = [process.env.PUBLIC_FRONTEND_URL, process.env.ADMIN_FRONTEND_URL].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  // Auth handshake: client connects with `auth: { token }` (same JWT as the REST API).
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role }
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Every user gets their own room so controllers can push events to
    // `user:<id>` without knowing which socket(s) belong to them.
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      // no-op for now — room membership is cleaned up automatically
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
