// ---------------------------------------------------------------------------
// Chat feature barrel.
//
// Re-exports the chat page, components, hooks, and color utilities so
// consumers can import from a single path:
//
//   import ChatPage from "@/features/chat";
//   import { useChatSocket, MessageList } from "@/features/chat";
// ---------------------------------------------------------------------------

// Pages
export { default as ChatPage } from "./pages/ChatPage";

// Store (persisted room navigation state)
export { useRoomsStore, useActiveRoom } from "./store/roomsStore";

// Components
export { default as MessageList } from "./components/MessageList";
export { default as MessageInput } from "./components/MessageInput";
export { default as RoomSidebar } from "./components/RoomSidebar";

// Hooks
export { useChatSocket } from "./hooks/useChatSocket";
export type { ConnectionStatus } from "./hooks/useChatSocket";
export { useResizable } from "./hooks/useResizable";
export { useMediaQuery } from "./hooks/useMediaQuery";

// Utils
export { colorForUser, readableTextOn } from "./utils/colors";
