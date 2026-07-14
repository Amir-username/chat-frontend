// ---------------------------------------------------------------------------
// Barrel file — re-exports every domain type so consumers can import from
// a single path:
//
//   import type { ChatMessage, TokenOut, UserOut } from "@/types";
//
// For tighter, more explicit imports you can also import from the domain
// files directly:
//
//   import type { ChatMessage } from "@/types/chat";
//   import type { TokenOut, LoginPayload } from "@/types/auth";
// ---------------------------------------------------------------------------

export * from "./api";
export * from "./user";
export * from "./auth";
export * from "./chat";
