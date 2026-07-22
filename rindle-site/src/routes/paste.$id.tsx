import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id")({
  component: () => <Outlet />,
});
