import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve the legacy public thought URLs that were served by the previous Worker.
export const Route = createFileRoute("/thoughts/t/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/thoughts/$id",
      params: { id: params.id },
      replace: true,
    });
  },
});
