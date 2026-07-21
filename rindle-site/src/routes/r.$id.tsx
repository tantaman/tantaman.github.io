// A room view (`/r/:id`): the room's messages oldest-first, each a live row, plus the composer. The
// single detail query is seeded by the loader for first paint; after hydration the wasm engine owns
// the live read and every new message streams in.

import { Link, createFileRoute } from "@tanstack/react-router";
import { fragmentKey, useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { roomDetailQuery } from "../components/RoomView.queries.ts";
import { MessageCard } from "../components/MessageCard.tsx";
import { Composer } from "../components/Composer.tsx";

export const Route = createFileRoute("/r/$id")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([roomDetailQuery(params.id)]) };
  },
  component: RoomView,
});

function RoomView() {
  const { id } = Route.useParams();
  const [room, { status }] = useRoot(roomDetailQuery, id);

  if (!room) {
    return (
      <section className="app-page">
        <p className="app-empty">{status === "complete" ? "Room not found." : "Loading room…"}</p>
        <Link to="/" className="app-link">← Back to rooms</Link>
      </section>
    );
  }

  const messages = room.messages ?? [];

  return (
    <section className="app-page">
      <div className="app-breadcrumb">
        <Link to="/">Rooms</Link> <span aria-hidden="true">/</span> <span>{room.name}</span>
      </div>
      <div className="app-page-head">
        <h1>{room.name}</h1>
      </div>

      <div className="app-messages">
        {messages.length === 0 ? (
          <p className="app-empty">No messages yet — say something below.</p>
        ) : (
          messages.map((message) => <MessageCard key={fragmentKey(message)} message={message} />)
        )}
      </div>

      <Composer roomId={room.id} />
    </section>
  );
}
