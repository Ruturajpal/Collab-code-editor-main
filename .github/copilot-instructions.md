# Collab Code Editor - AI Coding Agent Instructions

## Project Overview
A real-time collaborative code editor enabling multiple users to edit code simultaneously in shared rooms. Uses WebSocket for real-time synchronization and React frontend with Node.js/Express backend.

## Architecture

### Client-Server Communication
- **Transport**: Socket.IO (WebSocket-based) for real-time, bidirectional messaging
- **Server Entry Point**: `server/server.js` - Express app with Socket.IO
- **Key Data Maps on Server**:
  - `socketID_to_Users_Map`: Maps socket IDs to user objects with username
  - `roomID_to_Code_Map`: Persists room state (code + language) for new joiners

### Frontend Flow
1. **`client/src/routes/joinRoom/JoinRoom.js`**: Entry point - users create or join rooms via UUID (validated with `uuid.validate()`)
2. **`client/src/components/SocketWrapper.js`**: HOC that establishes Socket.IO connection and injects `socket` prop into children. Enforces username requirement for room access
3. **`client/src/routes/room/Room.js`**: Main editor interface using AceEditor with real-time sync

### Room Lifecycle
- User creates a room (generates UUID v4)
- User shares room ID with collaborators
- On join: server emits existing code/language to new user, notifies room members
- On disconnect: server cleans up user map and deletes room state if empty

## Critical Patterns

### WebSocket Event Flow
When code changes in Room.js:
```javascript
onChange() → socket.emit("update code") → server stores in roomID_to_Code_Map
         → socket.emit("syncing the code") → server broadcasts to room members
```

The dual emit pattern (update + sync) exists because:
- "update code" persists to server state for future joiners
- "syncing the code" broadcasts to other users in real-time

**Apply this pattern** when adding new collaborative features (e.g., language versions, settings).

### Language & Keybinding Management
- Supported languages in `Room.js`: javascript, java, c_cpp, python, typescript, golang, yaml, html
- AceEditor modes must be imported as: `"ace-builds/src-noconflict/mode-{language}"`
- Keybindings (default/vim/emacs) similarly imported
- Theme is hardcoded to "monokai" - modify `AceEditor theme` prop in `Room.js` to change

### State Synchronization for New Joiners
When a user joins an existing room, `SocketWrapper.js` emits "when a user joins" which triggers:
1. Server retrieves latest code and language from `roomID_to_Code_Map` (if room existed)
2. Server emits "on code change" + "on language change" to new user only
3. Server broadcasts "updating client list" to all users

**Ensure any new room state** is added to both the initial sync AND the update handlers in `Room.js` useEffect.

## Development Workflow

### Run Locally
```bash
# Terminal 1 - Backend (http://localhost:5000)
cd server && npm run server

# Terminal 2 - Frontend (http://localhost:3000)
cd client && npm start
```
- Backend watches files via nodemon
- Frontend uses React dev server with hot reload

### Build for Production
```bash
cd client && npm run build
```
- Set `REACT_APP_WEB_SOCKET_URL` env var to production server URL (required for client)
- Deploy `client/build` folder or use platform's root folder setting

## Key Dependencies

### Frontend
- `react-ace`: AceEditor wrapper - handles code editing, syntax highlighting
- `socket.io-client`: Real-time communication
- `react-router-dom`: Page routing (JoinRoom → Room)
- `react-hot-toast`: Toast notifications for user actions
- `uuid`: Room ID generation and validation

### Backend
- `socket.io`: WebSocket server with rooms support
- `express`: HTTP server + CORS
- `nodemon`: Development file watching

## Testing & Debugging Tips

### Multi-User Testing
1. Run backend on port 5000
2. Open frontend on multiple browser tabs/windows
3. Test code sync by editing in one tab, verifying in others
4. Test user list updates on join/leave

### Common Issues
- **WebSocket connection fails**: Verify `REACT_APP_WEB_SOCKET_URL` matches server URL and CORS is enabled
- **Code not syncing**: Check browser console for socket connection, verify both "update code" and "syncing the code" events fire
- **New joiner sees old code**: Verify room hasn't been deleted (check `roomID_to_Code_Map` logic in server)

## File Purposes
- `client/src/App.js`: Router configuration
- `client/src/index.js`: React DOM render
- `client/src/utils.js`: `generateColor()` - deterministic color from username
- `client/public/index.html`: HTML template
- `server/server.js`: All server logic (connection, events, state management)
