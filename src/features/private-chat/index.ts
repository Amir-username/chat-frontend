// ---------------------------------------------------------------------------
// Private-chat feature barrel.
//
// Re-exports the page, components, hooks, and API helpers so consumers can
// import from a single path:
//
//   import PrivateChatPage from "@/features/private-chat";
//   import { usePrivateChatSocket } from "@/features/private-chat";
// ---------------------------------------------------------------------------

// Pages
export { default as PrivateChatPage } from "./pages/PrivateChatPage";

// Components
export { default as PrivateChatList } from "./components/PrivateChatList";
export { default as PrivateMessageList } from "./components/PrivateMessageList";

// Hooks
export { usePrivateChatSocket } from "./hooks/usePrivateChatSocket";
export type { PrivateConnectionStatus } from "./hooks/usePrivateChatSocket";

// API
export {
  startPrivateChat,
  listPrivateChats,
  getPrivateChat,
  sendPrivateMessage,
} from "./api/privateChat";
