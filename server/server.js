require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ----------------------
// Vertex AI / Gemini initialization (optional)
// ----------------------
let aiClient = null;
const GEMINI_ENDPOINT = process.env.GEMINI_ENDPOINT || process.env.GEMINI_MODEL_ENDPOINT || null;
try {
  if (GEMINI_ENDPOINT) {
    // Use PredictionServiceClient from the installed @google-cloud/aiplatform package.
    // The environment should provide GOOGLE_APPLICATION_CREDENTIALS or ADC must be set.
    // eslint-disable-next-line global-require
    const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
    aiClient = new PredictionServiceClient();
    console.log('Vertex AI client initialized for endpoint:', GEMINI_ENDPOINT);
  } else {
    console.log('GEMINI_ENDPOINT not set — Gemini routes disabled');
  }
} catch (err) {
  console.warn('Vertex AI client not available, Gemini features disabled.', err && err.message);
}

// ----------------------
// Middlewares
// ----------------------
app.use(cors());
app.use(express.json());

// ----------------------
// Create HTTP server & Socket.io
// ----------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ----------------------
// REST API ROUTES
// ----------------------
app.get("/", (req, res) => {
  res.send("Backend Server is Running...");
});

// ---- Gemini REST API ----
app.post('/gemini', async (req, res) => {
  try {
    if (!aiClient || !GEMINI_ENDPOINT) {
      return res.status(501).json({ error: 'AI Platform client not configured' });
    }

    const { prompt } = req.body;

    const request = {
      endpoint: GEMINI_ENDPOINT,
      instances: [{ content: prompt }],
    };

    const [response] = await aiClient.predict(request);

    // Return predictions (shape depends on deployed model); caller can adapt.
    res.json({ response: response.predictions ? response.predictions : response });
  } catch (error) {
    console.error('Gemini REST Error:', error);
    res.status(500).json({ error: 'Gemini request failed' });
  }
});

// ----------------------
// Collaborative Editor Variables
// ----------------------
const socketID_to_Users = {};  // { socketId: { username } }
const roomID_to_Code = {};     // { roomId: { code, languageUsed } }

// ----------------------
// Helper: Get all users in room
// ----------------------
async function getUsersInRoom(roomId, io) {
  const sockets = await io.in(roomId).allSockets();
  const users = [];

  sockets.forEach(id => {
    if (socketID_to_Users[id]) {
      users.push(socketID_to_Users[id].username);
    }
  });

  return users;
}

// ----------------------
// Helper: Clean-up when user leaves
// ----------------------
async function handleUserLeave(io, socket, roomId) {
  const username = socketID_to_Users[socket.id]?.username;

  socket.to(roomId).emit("member left", { username });

  delete socketID_to_Users[socket.id];

  const users = await getUsersInRoom(roomId, io);

  socket.to(roomId).emit("updating client list", { userslist: users });

  if (users.length === 0) {
    delete roomID_to_Code[roomId];
  }
}

// ----------------------
// SOCKET.IO HANDLERS
// ----------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ----------------------
  // Gemini via WebSockets
  // ----------------------
  socket.on('ask_gemini', async ({ prompt }) => {
    if (!aiClient || !GEMINI_ENDPOINT) {
      return socket.emit('gemini_response', { response: 'AI Platform client not configured' });
    }

    try {
      const request = { endpoint: GEMINI_ENDPOINT, instances: [{ content: prompt }] };
      const [response] = await aiClient.predict(request);
      socket.emit('gemini_response', { response: response.predictions ? response.predictions : response });
    } catch (error) {
      console.error('Gemini WebSocket Error:', error);
      socket.emit('gemini_response', { response: 'Error using Gemini API' });
    }
  });

  // ----------------------
  // User joins room
  // ----------------------
  socket.on("when a user joins", async ({ roomId, username }) => {
    socketID_to_Users[socket.id] = { username };

    socket.join(roomId);

    const users = await getUsersInRoom(roomId, io);

    io.to(socket.id).emit("updating client list", { userslist: users });
    socket.to(roomId).emit("updating client list", { userslist: users });

    // Send existing code/language
    if (roomID_to_Code[roomId]) {
      io.to(socket.id).emit("on language change", {
        languageUsed: roomID_to_Code[roomId].languageUsed
      });

      io.to(socket.id).emit("on code change", {
        code: roomID_to_Code[roomId].code
      });
    }

    socket.to(roomId).emit("new member joined", { username });
  });

  // ----------------------
  // Language update
  // ----------------------
  socket.on("update language", ({ roomId, languageUsed }) => {
    roomID_to_Code[roomId] = { ...roomID_to_Code[roomId], languageUsed };
    socket.to(roomId).emit("on language change", { languageUsed });
  });

  // ----------------------
  // Sync language
  // ----------------------
  socket.on("syncing the language", ({ roomId }) => {
    if (roomID_to_Code[roomId]) {
      socket.emit("on language change", {
        languageUsed: roomID_to_Code[roomId].languageUsed
      });
    }
  });

  // ----------------------
  // Code update
  // ----------------------
  socket.on("update code", ({ roomId, code }) => {
    roomID_to_Code[roomId] = { ...roomID_to_Code[roomId], code };
    socket.to(roomId).emit("on code change", { code });
  });

  // ----------------------
  // Sync latest code
  // ----------------------
  socket.on("syncing the code", ({ roomId }) => {
    if (roomID_to_Code[roomId]) {
      socket.emit("on code change", {
        code: roomID_to_Code[roomId].code
      });
    }
  });

  // ----------------------
  // Leaving room
  // ----------------------
  socket.on("leave room", ({ roomId }) => {
    socket.leave(roomId);
    handleUserLeave(io, socket, roomId);
  });

  // ----------------------
  // Disconnect logic
  // ----------------------
  socket.on("disconnecting", () => {
    socket.rooms.forEach((roomId) => {
      if (roomID_to_Code[roomId]) {
        handleUserLeave(io, socket, roomId);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
