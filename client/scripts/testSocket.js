const { io } = require('socket.io-client');

const SERVER = process.env.SOCKET_URL || 'http://localhost:5000';
const ROOM = 'test-room';
const USERNAME = 'test-client';

console.log(`Connecting to ${SERVER}`);
const socket = io(SERVER, { reconnectionAttempts: 3, timeout: 5000 });

socket.on('connect', () => {
  console.log('connected, id=', socket.id);
  socket.emit('when a user joins', { roomId: ROOM, username: USERNAME });
});

socket.on('connect_error', (err) => {
  console.error('connect_error', err && err.message);
});

socket.on('updating client list', ({ userslist }) => {
  console.log('updating client list:', userslist);
});

socket.on('on code change', ({ code }) => {
  console.log('on code change:', code && code.slice(0, 120));
});

socket.on('on language change', ({ languageUsed }) => {
  console.log('on language change:', languageUsed);
});

socket.on('new member joined', ({ username }) => {
  console.log('new member joined:', username);
});

socket.on('member left', ({ username }) => {
  console.log('member left:', username);
});

socket.on('disconnect', (reason) => {
  console.log('disconnected:', reason);
});

// After 6 seconds, leave and disconnect
setTimeout(() => {
  console.log('Emitting leave room and disconnecting...');
  socket.emit('leave room', { roomId: ROOM });
  socket.disconnect();
  setTimeout(() => process.exit(0), 200);
}, 6000);
