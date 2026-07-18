import { useState, type FormEvent } from "react";

interface RoomSidebarProps {
  rooms: string[];
  activeRoom: string | null;
  onSelect: (room: string) => void;
  /** Optional: a friendly label for "you are logged in as X". */
  userEmail: string | undefined;
  onLogout: () => void;
  /** Sidebar width in pixels (desktop only). When undefined, the sidebar
   *  fills its container (mobile drawer). */
  width?: number;
}

const DEFAULT_ROOMS = ["general", "random", "help"];

export default function RoomSidebar({
  rooms,
  activeRoom,
  onSelect,
  userEmail,
  onLogout,
  width,
}: RoomSidebarProps) {
  const [newRoom, setNewRoom] = useState("");

  // Merge default rooms with any extras the user has joined this session.
  const allRooms = Array.from(new Set([...DEFAULT_ROOMS, ...rooms]));

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const trimmed = newRoom.trim();
    if (!trimmed) return;
    onSelect(trimmed);
    setNewRoom("");
  }

  return (
    <aside
      className="flex-shrink-0 bg-bg-1 border-r border-bg-3 flex flex-col h-full"
      // `width` is dynamic (driven by the resize hook) so it stays inline.
      // On mobile `width` is undefined → fill the drawer container.
      style={width !== undefined ? { width } : { width: "100%" }}
    >
      {/* Brand */}
      <div className="px-5 py-4 border-b border-bg-3 font-semibold text-[15px] tracking-tight">
        <span className="text-accent">●</span> Chat
      </div>

      {/* Room list — scrolls independently if it ever overflows.
          The join-room form lives OUTSIDE this scroll area so it never
          contributes to the sidebar's scrollbar. */}
      <div className="flex-1 overflow-y-auto px-2 py-3 min-h-0">
        <div className="px-3 pb-2 text-[11px] text-fg-2 uppercase tracking-wider font-semibold">
          Rooms
        </div>
        <ul className="list-none m-0 p-0">
          {allRooms.map((room) => {
            const active = room === activeRoom;
            return (
              <li key={room}>
                <button
                  onClick={() => onSelect(room)}
                  className={
                    "w-full text-left px-3 py-2 rounded-md mb-0.5 border-none " +
                    "cursor-pointer transition-colors " +
                    (active
                      ? "bg-indigo-500/15 text-fg-0 font-medium"
                      : "bg-transparent text-fg-1 font-normal hover:bg-bg-2")
                  }
                >
                  <span className="text-fg-2 mr-1.5">#</span>
                  {room}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Join a new room — pinned above the user footer, never scrolls. */}
      <form
        onSubmit={handleJoin}
        className="px-2 py-3 flex gap-1.5 flex-shrink-0"
      >
        <input
          type="text"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          placeholder="Join room…"
          className="flex-1 px-2.5 py-2 text-[13px]"
        />
        <button
          type="submit"
          className="btn btn-secondary px-3 py-2"
          disabled={!newRoom.trim()}
        >
          Join
        </button>
      </form>

      {/* User footer */}
      <div className="px-4 py-3 border-t border-bg-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div
            className="text-[13px] text-fg-0 whitespace-nowrap overflow-hidden text-ellipsis"
            title={userEmail}
          >
            {userEmail ?? "—"}
          </div>
          <div className="text-[11px] text-fg-2">online</div>
        </div>
        <button
          onClick={onLogout}
          className="btn btn-ghost px-2.5 py-1.5 text-xs"
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
