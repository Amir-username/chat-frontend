# chat-frontend

A modern real-time chat application frontend built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS 4**. This is the frontend part of the [chat-service](https://github.com/Amir-username/chat-service) backend project (FastAPI + [fast-auth](https://github.com/Amir-username/fast-auth)).

**Live Demo:** [https://chat-frontend-psi-wine.vercel.app/](https://chat-frontend-psi-wine.vercel.app/)

---

## Features

### Authentication
- **Register & Login** — JSON-based auth with `/auth/register` and `/auth/login/json` endpoints
- **Auto Hydration** — on page reload, calls `/auth/me` to restore the current user session
- **Logout** — revokes both access and refresh tokens on the backend

### Token Management
- **Transparent Auto-Refresh** — an axios response interceptor catches `401` errors and automatically calls `/auth/refresh` to obtain a new access token, then replays the original request without the caller ever seeing the error
- **Concurrent Request Coalescing** — when multiple requests fail with 401 at the same time, only a single refresh call is made; all other requests are queued and replayed once the new token arrives
- **Graceful Fallback** — if the refresh itself fails, tokens are cleared and the user is redirected to the login page

### Real-Time Chat
- **WebSocket Connection** — connects to `/ws/chat/{room_id}?token=...` for instant message delivery
- **Auto-Reconnect** — on accidental disconnection, reconnects with exponential backoff (1s → 2s → 4s → ... → 15s cap)
- **History Replay** — the server sends full room history on connect, so the message list is immediately populated when joining a room
- **System Messages** — join/leave notifications are rendered centered and muted for a clean look

### Rooms
- **Default Rooms** — `general`, `random`, and `help` are available out of the box
- **Join Any Room** — an ad-hoc input lets you join any room by name
- **Persistent Sessions** — joined rooms are saved to `localStorage` and restored across reloads

### UI/UX
- **Dark Theme** — modern dark design using Tailwind CSS 4 utility classes
- **Message Grouping** — consecutive messages from the same user are visually grouped with avatars
- **Keyboard Shortcuts** — `Enter` to send, `Shift+Enter` for a new line
- **Responsive Layout** — sidebar + chat area layout that works on different screen sizes

### Internationalization (i18n)
- **Multi-Language Support** — powered by `i18next` and `react-i18next` for translatable UI strings

### State Management
- **Zustand** — lightweight global state management for application-wide data

### Type Safety
- **Typed API Client** — all API wrappers and WebSocket messages are fully typed, mirroring the Pydantic schemas defined in the backend

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [React](https://react.dev/) 18 | UI library |
| [TypeScript](https://www.typescriptlang.org/) 6 | Type safety |
| [Vite](https://vitejs.dev/) 5 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) 4 | Utility-first styling |
| [Axios](https://axios-http.com/) | HTTP client with interceptors |
| [Zustand](https://zustand.docs.pmnd.rs/) | Global state management |
| [React Router](https://reactrouter.com/) 6 | Client-side routing |
| [i18next](https://www.i18next.com/) | Internationalization |

---

## Backend

This frontend is designed to work with the [chat-service](https://github.com/Amir-username/chat-service) backend. The backend provides:

- FastAPI-based REST API with authentication via [fast-auth](https://github.com/Amir-username/fast-auth)
- WebSocket endpoint for real-time messaging
- JWT access + refresh token authentication

| Endpoint | Method | Notes |
|---|---|---|
| `/auth/register` | POST | Custom endpoint with `name` field |
| `/auth/login/json` | POST | JSON login (preferred over OAuth2 form) |
| `/auth/refresh` | POST | Called automatically by the axios interceptor on 401 |
| `/auth/logout` | POST | Revokes access + refresh tokens |
| `/auth/me` | GET | Hydrates the current user on page load |
| `/ws/chat/{room_id}` | WS | `?token=<access_token>` query param |

---

## Prerequisites

1. The backend running on `http://localhost:8000`:

   ```bash
   cd chat-service
   uv run uvicorn app.main:app --reload --port 8000
   ```

2. Node 18+ (tested with Node 24).

---

## Install & Run

```bash
# Clone the repository
git clone https://github.com/Amir-username/chat-frontend.git
cd chat-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` and `/ws/*` to `http://localhost:8000` so the browser uses same-origin requests — no CORS configuration needed on the backend.

---

## Production Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

To point the frontend at a deployed backend instead of localhost, set `VITE_API_BASE_URL` before building:

```bash
# .env.production
VITE_API_BASE_URL=https://chat-api.example.com
```

The WebSocket URL is derived from this same value (http → ws, https → wss).

---

## Project Structure

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

---

## How It Works

### Auto-Refresh Flow

1. Every request goes through an axios request interceptor that attaches `Authorization: Bearer <access_token>` from `localStorage`.
2. If the backend returns 401 (access token expired), the response interceptor calls `/auth/refresh` with the stored refresh token.
3. On success, it stores the new token pair and **replays the original request** — the caller never sees the 401.
4. If multiple requests 401 simultaneously, only one refresh flies; the others are queued and replayed once the refresh resolves.
5. If refresh itself fails, tokens are cleared and the user is redirected to `/login`.

### WebSocket Reconnect Flow

- On room change, the hook closes the old socket and opens a new one to `/ws/chat/{room_id}?token=<access>`.
- On accidental close (not triggered by us), it reconnects with exponential backoff: 1s → 2s → 4s → ... → 15s cap.
- The server sends a `history` message immediately on connect; the hook unwraps it and feeds each historical message to the UI as if it had just arrived, so the message list shows full room history on entry.
- System messages (`X joined the room` / `X left the room`) are rendered centered and muted.

---

## License

ISC