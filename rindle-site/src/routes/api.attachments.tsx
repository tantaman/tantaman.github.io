import { createFileRoute } from "@tanstack/react-router";

// Keep the upload index and download splat under an explicit shared parent.
export const Route = createFileRoute("/api/attachments")({});
