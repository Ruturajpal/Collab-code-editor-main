# AI Copilot Instructions - Collaborative Code Editor

## Architecture Overview

This is a **collaborative real-time code editor** built with Angular 20 that combines:
- **Yjs** - CRDT library for real-time document synchronization across multiple clients
- **CodeMirror 6** - The editor UI with language support and AI-powered code completion
- **WebSocket** - Real-time communication via `y-websocket` connecting to a backend at `ws://localhost:1234`
- **AI Backend** - REST API at `/api/complete-code` for code completion suggestions

**Key Data Flow**: User code → CodeMirror → Yjs (shared state) → WebSocket → Backend AI service → completion response

## Project Structure

```
src/app/
├── app.ts              // Root component with RouterOutlet, uses zoneless change detection
├── app.routes.ts       // Two routes: Home (/), Editor (/editor)
├── app.config.ts       // Providers: HttpClient, Router, zoneless detection
├── component/
│   ├── home/          // Entry point: room ID input form, navigates to editor
│   └── editor/        // Main editor: CodeMirror + Yjs + AI completion
└── service/
    └── ai.ts          // HTTP service for /api/complete-code endpoint
```

## Core Components

### Editor Component (`src/app/component/editor/editor.ts`)
- **Route Parameter**: `room` query param determines the Yjs synchronization room
- **Three Integrations**:
  1. **Yjs Setup**: Creates Y.Doc, WebsocketProvider, and shared `yText` object
  2. **CodeMirror**: Renders in element with ID `#editor` using basicSetup + JavaScript language
  3. **AI Completion**: Intercepts autocompletion requests, sends full doc + cursor offset to backend

**Critical Flow**: `context.pos` is the cursor position → passed as `cursorOffset` to AI service → response formatted into CompletionResult

### Home Component (`src/app/component/home/home.ts`)
- Simple form component: captures `roomId` input and navigates to `/editor?room={roomId}`
- Validates room ID to prevent empty submissions

### AI Service (`src/app/service/ai.ts`)
- Single method: `getCompletion(code: string, cursor: number)` 
- Returns Observable of HTTP POST to `/api/complete-code` with payload: `{ code, cursorOffset: cursor }`
- Response expected: `{ completion: string }` (or empty string as fallback)

## Development Workflow

**Scripts** (from `package.json`):
- `npm start` → `ng serve` (dev server on http://localhost:4200)
- `npm test` → `ng test` (Karma + Jasmine)
- `npm run build` → compile to `dist/`
- `npm run watch` → rebuild on file changes

**Backend Requirement**: WebSocket server must be running at `ws://localhost:1234` for editor room synchronization. Ensure server is started before testing the editor route.

## Conventions & Patterns

### Angular Patterns
- **Standalone Components**: All components use `imports: []` array (no NgModule)
- **Zoneless Change Detection**: Configured via `provideZonelessChangeDetection()` in app.config.ts (Angular 20)
- **Signals**: Root app uses `signal('code_editor')` for reactive state
- **Type Safety**: Avoid `any` types; use typed HttpClient generics like `getCompletion(...)` → `Observable<any>` should be typed response interface

### Formatting
- **Prettier Config**: 100 char line width, single quotes, angular parser for HTML
- **File Naming**: Kebab-case for file names (`editor.ts`, `home.ts`), PascalCase for component/class names (e.g., `export class Editor`)

### Testing
- Test files follow `*.spec.ts` pattern (e.g., `editor.spec.ts`)
- Use Jasmine framework with Karma test runner

## Common Tasks

**Adding a new route**:
1. Create component in `src/app/component/{name}/`
2. Add route to `app.routes.ts`: `{ path: 'name', component: ComponentName }`
3. Use `Router.navigate()` to link from other components

**Modifying AI completion behavior**:
- Edit the `override` function in `editor.ts` autocompletion config
- Response handling: `response.completion` is the suggested code
- Ensure cursor position calculation matches backend expectations

**Debugging synchronization**:
- Check WebSocket connection in browser DevTools (Network tab)
- Verify room ID is correctly passed as query param to `/editor`
- Yjs document state accessible via `yDoc` in editor component

## External Dependencies to Know

- `@codemirror/*`: Editor libraries (6.x API)
- `y-codemirror.next`: CodeMirror ↔ Yjs binding (`yCollab` function)
- `y-websocket`: WebSocket provider for Yjs (`WebsocketProvider` class)
- `rxjs`: Async operations (HttpClient returns Observables)

