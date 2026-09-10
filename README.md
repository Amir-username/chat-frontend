# chat-frontend

A modern real-time **private chat** (direct messages) frontend built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS 4**. This is the frontend part of the [chat-service](https://github.com/Amir-username/chat-service) backend project (FastAPI + [fast-auth](https://github.com/Amir-username/fast-auth)).

**Live Demo:** [https://chat-frontend-psi-wine.vercel.app/](https://chat-frontend-psi-wine.vercel.app/)

---

## Features

### Authentication
- **Register & Login** — JSON-based auth with `/auth/register` and `/auth/login/json` endpoints
- **Auto Hydration** — on page reload, calls `/auth/me/profile` to restore the current user session
- **Logout** — revokes both access and refresh tokens on the backend

### Token Management
- **Transparent Auto-Refresh** — an axios response interceptor catches `401` errors and automatically calls `/auth/refresh` to obtain a new access token, then replays the original request without the caller ever seeing the error
- **Concurrent Request Coalescing** — when multiple requests (REST or WebSocket reconnects) need a refresh at the same time, only a single refresh call is made; everyone awaits the same promise
- **WS-Aware Refresh** — the private-chat WebSocket refreshes an expired access token *before* reconnecting, so a long-lived session recovers cleanly instead of failing forever
- **Graceful Fallback** — if the refresh itself fails, tokens are cleared and the user is redirected to the login page

### Real-Time Private Chat
- **WebSocket Connection** — connects to `/private/ws/chat/{chat_id}?token=...` for instant message delivery
- **Auto-Reconnect** — on accidental disconnection, reconnects with exponential backoff (1s → 2s → 4s → ... → 15s cap)
- **History on Connect** — the server sends the last 50 messages on connect; the UI merges it safely with the initial REST fetch (no duplicate or lost messages)
- **Reply / Quote** — swipe or tap the reply button on any message to quote it (Telegram-style)
- **System Messages** — online/offline notices are rendered centered and muted
- **StrictMode-Safe** — stale-socket guards survive React 18 StrictMode double-mounting without connect/disconnect storms

### Profiles
- **Editable Own Profile** — name, bio, and profile image upload (JPG/PNG/GIF/WebP, max 5 MB)
- **Public Profiles** — `/users/:userId` shows any user's name, avatar, and bio, with a "Message" button to start a chat
- **User Search** — debounced, abortable search overlay (find users by name, self excluded)

### UI/UX
- **Dark Theme** — modern dark design using Tailwind CSS 4 utility classes
- **RTL Support** — full Persian (فارسی) translation with RTL layout and the Vazirmatn font
- **Message Bubbles** — own messages right-aligned with accent color, per-user stable avatar colors
- **Keyboard Shortcuts** — `Enter` to send, `Shift+Enter` for a new line
- **Responsive Layout** — conversation list + chat panes adapt to mobile (stacked with back navigation)

### State & Type Safety
- **Zustand** — lightweight global state management (module-level singleton stores)
- **Typed API Client** — all API wrappers and WebSocket messages are fully typed, mirroring the Pydantic schemas defined in the backend

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [React](https://react.dev/) 18 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) 5 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) 4 | Utility-first styling |
| [Axios](https://axios-http.com/) | HTTP client with interceptors |
| [Zustand](https://zustand.docs.pmnd.rs/) | Global state management |
| [React Router](https://reactrouter.com/) 6 | Client-side routing |
| [i18next](https://www.i18next.com/) | Internationalization (en/fa + RTL) |

---

## Backend

This frontend is designed to work with the [chat-service](https://github.com/Amir-username/chat-service) backend. The backend provides:

- FastAPI-based REST API with authentication via [fast-auth](https://github.com/Amir-username/fast-auth)
- WebSocket endpoint for real-time private messaging
- JWT access + refresh token authentication

| Endpoint | Method | Notes |
|---|---|---|
| `/auth/register` | POST | Custom endpoint with `name` field |
| `/auth/login/json` | POST | JSON login (preferred over OAuth2 form) |
| `/auth/refresh` | POST | Called automatically on 401 and before WS reconnects |
| `/auth/logout` | POST | Revokes access + refresh tokens |
| `/auth/me/profile` | GET | Hydrates the current user on page load |
| `/auth/search` | GET | User search by name |
| `/private/chats` | GET/POST | List chats / start a chat with a user |
| `/private/chats/{id}` | GET | Chat details + message page |
| `/private/ws/chat/{chat_id}` | WS | `?token=<access_token>` query param |

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

Open [http://localhost:5173](http://localhost:5173). With `VITE_API_BASE_URL` left empty (the default), the Vite dev server proxies `/api`, `/private/ws`, and `/uploads` to the deployed backend (`https://chat-service.fastapicloud.dev` — adjust the proxy targets in `vite.config.ts` to point at your local backend), so the browser uses same-origin requests — no CORS configuration needed.

---

## Production Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

To point the frontend at a deployed backend instead of the dev proxy, set `VITE_API_BASE_URL` before building (see `.env.example`):

```bash
# .env.production
VITE_API_BASE_URL=https://chat-api.example.com
```

The REST client, image URLs, and WebSocket URLs all derive from this single value (`http(s)` is converted to `ws(s)` for sockets).

---

## Project Structure

```
src/
├── features/
│   ├── auth/            # login/register/profile pages, authStore (Zustand),
│   │                    # Avatar, user search overlay, profile hooks
│   └── private-chat/    # PrivateChatPage, chat list, message list,
│                        # usePrivateChatSocket (WS + refresh + backoff)
├── shared/
│   ├── api/             # config (base URL), client (axios + refresh
│   │                    # interceptor), tokens, image URL helper
│   ├── components/      # MessageInput, LanguageSwitcher, SearchIcon
│   ├── hooks/           # useDebouncedValue, useMediaQuery
│   ├── types/           # API + WS message types mirroring backend schemas
│   └── utils/           # stable per-user color hashing
├── i18n/                # en/fa locales, RTL direction handling
├── App.tsx              # routes + protected-route gating
├── main.tsx             # entry — BrowserRouter
└── index.css            # dark theme tokens + base styles
```

---

## How It Works

### Auto-Refresh Flow

1. Every request goes through an axios request interceptor that attaches `Authorization: Bearer <access_token>` from `localStorage`.
2. If the backend returns 401 (access token expired), the response interceptor calls `refreshAccessToken()` — a shared, coalesced helper.
3. On success, it stores the new token pair and **replays the original request** — the caller never sees the 401.
4. If multiple requests 401 simultaneously, they all await the same refresh promise; only one request flies.
5. If refresh itself fails, tokens are cleared and the user is redirected to `/login`.

### WebSocket Reconnect Flow

- On chat change, the hook closes the old socket and opens a new one to `/private/ws/chat/{chat_id}?token=<access>`.
- Before connecting, if the stored access token is expired, it is refreshed via the same shared helper — so a session that outlived its access token reconnects cleanly.
- On accidental close, it reconnects with exponential backoff: 1s → 2s → 4s → ... → 15s cap.
- The server sends the last 50 messages (`history`) on connect; the UI replaces its list with that snapshot (deduplicated against the initial REST fetch), so the message list is always current after a reconnect.
- System messages (`X is online` / `X went offline`) are rendered centered and muted.

---

## License

ISC
