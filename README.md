# chat-frontend

A simple React + Vite + TypeScript frontend for the
[chat-service](https://github.com/Amir-username/chat-service) backend
(FastAPI + [fast-auth](https://github.com/Amir-username/fast-auth)).

## Features

- **Auth** — register, login (JSON), logout, auto `/auth/me` hydration on reload
- **Auto refresh** — axios interceptor transparently refreshes expired access
  tokens via `/auth/refresh` on 401, with concurrent-request coalescing
- **Realtime chat** — WebSocket connection to `/ws/chat/{room_id}?token=…`
  with auto-reconnect (exponential backoff) and history replay on connect
- **Multiple rooms** — sidebar with default rooms (`general`, `random`, `help`)
  plus an ad-hoc "join room" input; joined rooms persist across reloads
- **Dark UI** — modern dark theme with message grouping, avatars, and
  keyboard shortcuts (Enter to send, Shift+Enter for newline)
- **Type safety** — typed API client and WebSocket messages mirroring the
  Pydantic schemas in the backend

## Endpoints used

| Endpoint | Method | Notes |
|---|---|---|
| `/auth/register` | POST | Custom endpoint with `name` field |
| `/auth/login/json` | POST | JSON login (preferred over OAuth2 form) |
| `/auth/refresh` | POST | Called automatically by the axios interceptor on 401 |
| `/auth/logout` | POST | Revokes access + refresh tokens |
| `/auth/me` | GET | Hydrates the current user on page load |
| `/ws/chat/{room_id}` | WS | `?token=<access_token>` query param |

Admin-only endpoints (`/auth/users`, `/auth/users/{id}`) are not exposed in
the UI — add an admin panel later if needed.

## Prerequisites

1. The backend running on `http://localhost:8000`:

   ```bash
   cd chat-service
   uv run uvicorn app.main:app --reload --port 8000
   ```

2. Node 18+ (tested with Node 24).

## Install & run

```bash
cd chat-frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` and `/ws/*`
to `http://localhost:8000` so the browser uses same-origin requests — no CORS
configuration needed on the backend.

## Production build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

To point the frontend at a deployed backend instead of localhost, set
`VITE_API_BASE_URL` before building:

```bash
# .env.production
VITE_API_BASE_URL=https://chat-api.example.com
```

The WebSocket URL is derived from this same value (http → ws, https → wss).

## Project structure

```
src/
├── api/
│   ├── auth.ts          # typed wrappers around /auth/* endpoints
│   ├── client.ts        # axios instance + 401-refresh interceptor
│   └── tokens.ts        # localStorage token persistence
├── components/
│   ├── MessageInput.tsx
│   ├── MessageList.tsx
│   └── RoomSidebar.tsx
├── context/
│   └── AuthContext.tsx  # user/session state + login/register/logout
├── hooks/
│   └── useChatSocket.ts # WebSocket lifecycle + reconnect logic
├── pages/
│   ├── ChatPage.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── types/
│   └── index.ts         # API + WS message types mirroring backend schemas
├── App.tsx              # routes + protected-route gating
├── main.tsx             # entry — BrowserRouter + AuthProvider
└── index.css            # dark theme tokens + base styles
```

## How the auto-refresh works

1. Every request goes through an axios request interceptor that attaches
   `Authorization: Bearer <access_token>` from `localStorage`.
2. If the backend returns 401 (access token expired), the response
   interceptor calls `/auth/refresh` with the stored refresh token.
3. On success, it stores the new token pair and **replays the original
   request** — the caller never sees the 401.
4. If multiple requests 401 simultaneously, only one refresh flies; the
   others are queued and replayed once the refresh resolves.
5. If refresh itself fails, tokens are cleared and the user is redirected
   to `/login`.

## How the WebSocket reconnect works

- On room change, the hook closes the old socket and opens a new one to
  `/ws/chat/{room_id}?token=<access>`.
- On accidental close (not triggered by us), it reconnects with exponential
  backoff: 1s → 2s → 4s → … → 15s cap.
- The server sends a `history` message immediately on connect; the hook
  unwraps it and feeds each historical message to the UI as if it had just
  arrived, so the message list shows full room history on entry.
- System messages (`X joined the room` / `X left the room`) are rendered
  centered and muted.
