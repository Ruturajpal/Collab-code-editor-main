const { io } = require('socket.io-client');

const SERVER = process.env.SOCKET_URL || 'http://localhost:5000';
const ROOM_ID = 'integration-test-room-1';

function createClient(name) {
  const socket = io(SERVER, { reconnectionDelayMax: 10000 });
  socket.name = name;
  socket.on('connect', () => console.log(`${name} connected (id=${socket.id})`));
  socket.on('disconnect', (reason) => console.log(`${name} disconnected: ${reason}`));
  socket.on('updating client list', ({ userslist }) => console.log(`${name} updating client list:`, userslist));
  socket.on('on code change', ({ code }) => console.log(`${name} received on code change:`, code));
  socket.on('on language change', ({ languageUsed }) => console.log(`${name} received on language change:`, languageUsed));
  socket.on('new member joined', ({ username }) => console.log(`${name} new member joined:`, username));
  socket.on('member left', ({ username }) => console.log(`${name} member left:`, username));
  return socket;
}

async function runTest() {
  console.log('Starting two-client socket integration test against', SERVER);
  const A = createClient('ClientA');
  const B = createClient('ClientB');

  let aReady = false;
  let bReady = false;

  A.on('connect', () => {
    A.emit('when a user joins', { roomId: ROOM_ID, username: 'ClientA' });
    aReady = true;
  });

  B.on('connect', () => {
    B.emit('when a user joins', { roomId: ROOM_ID, username: 'ClientB' });
    bReady = true;
  });

  function waitForBoth(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        if (aReady && bReady) { clearInterval(iv); resolve(); }
        if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error('Timeout waiting for clients to connect/join')); }
      }, 50);
    });
  }

  try {
    await waitForBoth(7000);
    console.log('Both clients joined — sending code update from ClientA');

    // Listen on B for the code change and resolve when received
    const codeReceived = new Promise((resolve) => {
      B.once('on code change', ({ code }) => resolve(code));
    });

    // ClientA updates code
    const testCode = "console.log('Hello from ClientA')";
    A.emit('update code', { roomId: ROOM_ID, code: testCode });
    A.emit('syncing the code', { roomId: ROOM_ID });

    const received = await Promise.race([codeReceived, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for on code change')), 5000))]);
    console.log('Test success — ClientB received code:', received);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    setTimeout(() => {
      try { A.disconnect(); } catch {};
      try { B.disconnect(); } catch {};
      process.exit(0);
    }, 500);
  }
}

runTest();
