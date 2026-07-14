// ---------------------------------------------------------------------------
// useRoomsStore — persisted chat-room navigation state.
//
// Holds the two pieces of chat state that SHOULD survive a page reload:
//   - joinedRooms: the list of rooms shown in the sidebar
//   - activeRoom:  the currently-selected room
//
// Persistence is handled by zustand/middleware/persist, which replaces the
// manual loadRooms()/saveRooms() helpers + the useEffect-on-change that
// ChatPage used previously. localStorage is the storage backend, keyed under
// "chat.rooms" (matches the old key so existing users keep their rooms).
//
// Ephemeral UI state (messages list, mobile drawer open/closed) stays as
// useState in ChatPage — it's local to the component and shouldn't persist.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RoomsState {
  /** Rooms the user has joined this session (persisted). Defaults to none;
   *  the sidebar always shows the built-in rooms (general/random/help) on
   *  top of these, so an empty list is fine. */
  joinedRooms: string[];

  /** Currently selected room. Falls back to "general" in the selector below
   *  if null, but we persist it as-is so returning to the app lands you in
   *  the room you left. */
  activeRoom: string | null;

  /** Add a room to the joined list (no-op if already present). */
  joinRoom: (room: string) => void;
  /** Switch the active room (also joins it if not already joined). */
  selectRoom: (room: string) => void;
  /** Reset to initial state — useful on logout. */
  resetRooms: () => void;
}

export const useRoomsStore = create<RoomsState>()(
  persist(
    (set) => ({
      joinedRooms: [],
      activeRoom: null,

      joinRoom: (room) =>
        set((state) =>
          state.joinedRooms.includes(room)
            ? state
            : { joinedRooms: [...state.joinedRooms, room] },
        ),

      selectRoom: (room) =>
        set((state) => ({
          activeRoom: room,
          joinedRooms: state.joinedRooms.includes(room)
            ? state.joinedRooms
            : [...state.joinedRooms, room],
        })),

      resetRooms: () => set({ joinedRooms: [], activeRoom: null }),
    }),
    {
      name: "chat.rooms", // localStorage key (also used as the partialize id)
      storage: createJSONStorage(() => localStorage),
      // Only persist the data fields, not the action functions.
      partialize: (state) => ({
        joinedRooms: state.joinedRooms,
        activeRoom: state.activeRoom,
      }),
    },
  ),
);

/** Convenience selector: the active room, falling back to "general" when
 *  nothing is selected (e.g. first-ever visit). */
export function useActiveRoom(): string {
  return useRoomsStore((s) => s.activeRoom ?? "general");
}
